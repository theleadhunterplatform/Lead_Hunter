import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import Claim from '../models/claim.model';
import ErrorResponse from '../utils/error-response.utils';
import * as authService from '../services/auth.service';
import { sendEmail, isEmailConfigured } from '../utils/email.service';
import { isVerifiedEmailStatus } from '../utils/lead-enrichment.utils';

// @desc    Update claim CRM status
// @route   PUT /api/crm/claims/:id
// @access  Private
export const updateClaimStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status, notes } = req.body;
    const userId = (req.user as any)._id;

    const claim = await Claim.findOne({ _id: req.params.id, userId });
    if (!claim) {
        throw new ErrorResponse('Claim not found or unauthorized', 404);
    }

    const claimDoc = claim as any;
    if (status) claimDoc.status = status;
    if (notes !== undefined) claimDoc.notes = notes;
    
    await claimDoc.save();

    return res.status(200).json({
        success: true,
        data: claim
    });
});

// @desc    Send email to a lead
// @route   POST /api/crm/send-email
// @access  Private
export const sendEmailToLead = asyncHandler(async (req: Request, res: Response) => {
    const { leadId, subject, body } = req.body;
    const userId = (req.user as any)._id;

    // 1. Verify user has claimed this lead
    const claim = await Claim.findOne({ userId, leadId }, { populate: 'leadId' });
    if (!claim) {
        throw new ErrorResponse('You must claim this lead before sending an email.', 403);
    }

    const lead = claim.leadId as any;
    if (!lead.email) {
        throw new ErrorResponse('Lead email address not found. Use enrichment first.', 400);
    }

    const emailStatus = lead.contact_info?.email_status;
    const emailVerified = isVerifiedEmailStatus(emailStatus);

    if (!isEmailConfigured()) {
        throw new ErrorResponse(
            'Email sending is not configured. Set RESEND_API_KEY or SMTP_* on the server.',
            503
        );
    }

    await sendEmail({
        to: lead.email,
        subject: subject || 'Strategic Partnership Inquiry',
        html: `<div style="font-family:sans-serif;white-space:pre-wrap">${body || ''}</div>`,
        text: body,
    });

    console.log(`📧 [CRM] Email sent to ${lead.email}${emailVerified ? '' : ' (unverified)'}`);

    // 3. Update claim status
    const claimDoc = claim as any;
    claimDoc.status = 'contacted';
    claimDoc.last_contacted = new Date();
    await claimDoc.save();

    return res.status(200).json({
        success: true,
        message: emailVerified
            ? `Email successfully sent to ${lead.email}`
            : `Outreach logged for ${lead.email} (email not fully verified — confirm before sending in production).`,
        data: {
            status: claimDoc.status,
            last_contacted: claimDoc.last_contacted,
            email_verified: emailVerified,
        }
    });
});

// @desc    Add team member to organization
// @route   POST /api/crm/team/invite
// @access  Private (Org Admin)
export const inviteTeamMember = asyncHandler(async (req: Request, res: Response) => {
    const { email, name, password, roleSlug = 'org_user' } = req.body;
    const adminUser = req.user as any;

    if (!adminUser.organization) {
        throw new ErrorResponse('You must belong to an organization to invite team members.', 403);
    }

    const result = await authService.createInvitedUser({
        name,
        email,
        organizationId: adminUser.organization.toString(),
        assignedById: adminUser._id.toString(),
        roleSlug,
        password,
    });

    return res.status(201).json({
        success: true,
        message: isEmailConfigured()
            ? `Invitation email sent to ${email}`
            : `User ${email} created. Share the temporary password securely.`,
        data: {
            id: result.user._id,
            email: result.user.email,
            role: result.role.name,
            invite_email_sent: isEmailConfigured(),
            temp_password: result.tempPassword,
        },
    });
});
