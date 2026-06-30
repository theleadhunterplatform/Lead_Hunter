import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import Claim from '../models/claim.model';
import User from '../models/user.model';
import ErrorResponse from '../utils/error-response.utils';
import { hashPassword } from '../utils/password.utils';
import RoleAssignment from '../models/role-assignment.model';
import Role from '../models/role.model';

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
    if (emailStatus !== 'verified' && emailStatus !== 'valid' && emailStatus !== 'deliverable') {
        throw new ErrorResponse('Only verified emails can be used for outreach.', 400);
    }

    // 2. Mock Email Sending (Integrate with SendGrid/SMTP in production)
    console.log(`📧 [CRM] Sending email to ${lead.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);

    // 3. Update claim status
    const claimDoc = claim as any;
    claimDoc.status = 'contacted';
    claimDoc.last_contacted = new Date();
    await claimDoc.save();

    return res.status(200).json({
        success: true,
        message: `Email successfully sent to ${lead.email}`,
        data: {
            status: claimDoc.status,
            last_contacted: claimDoc.last_contacted
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

    // 1. Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });
    if (user && !user.is_deleted) {
        throw new ErrorResponse('User already exists in the system.', 400);
    }

    if (user?.is_deleted) {
        await RoleAssignment.removeAllForUser(user._id.toString());
        user = await User.findOneAndUpdate(
            { _id: user._id },
            {
                name,
                password: await hashPassword(password?.trim() || 'ChangeMe123!'),
                organizationId: adminUser.organization,
                is_deleted: false,
                is_active: true,
                lead_access_enabled: true,
                deleted_at: null,
                status: 'active',
            }
        );
    } else {
        // 2. Create user
        user = await User.create({
            name,
            email: normalizedEmail,
            password: password?.trim() || 'ChangeMe123!',
            organization: adminUser.organization
        });
    }

    // 3. Assign Role in this organization
    const role = await Role.findOne({ slug: roleSlug });
    if (!role) {
        throw new ErrorResponse('Invalid role specified.', 400);
    }

    await RoleAssignment.create({
        userId: user._id,
        roleId: role._id,
        scope: { type: 'organization', organizationId: adminUser.organization },
        assignedBy: adminUser._id
    });

    return res.status(201).json({
        success: true,
        message: `User ${email} invited and assigned to ${role.name}`,
        data: {
            id: user._id,
            email: user.email,
            role: role.name
        }
    });
});
