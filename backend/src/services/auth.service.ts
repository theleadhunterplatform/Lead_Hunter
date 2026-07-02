import User from '../models/user.model';
import Role from '../models/role.model';
import Organization from '../models/organization.model';
import RoleAssignment from '../models/role-assignment.model';
import ErrorResponse from '../utils/error-response.utils';
import { generateTokenPair } from '../utils/token.utils';
import jwt from 'jsonwebtoken';
import config from '../config';
import { getUserPermissions, hasPermission } from '../utils/rbac.utils';
import { hashPassword } from '../utils/password.utils';
import prisma from '../lib/prisma';
import { generateSecureToken, hashToken, generateTempPassword } from '../utils/crypto-token.utils';
import {
    sendEmail,
    buildPasswordResetEmail,
    buildInviteEmail,
    isEmailConfigured,
} from '../utils/email.service';

async function reactivateDeletedUser(
    existing: any,
    data: { name: string; password: string; organizationId?: string | null }
) {
    const updateData: Record<string, unknown> = {
        name: data.name,
        password: await hashPassword(data.password),
        is_deleted: false,
        is_active: true,
        lead_access_enabled: true,
        deleted_at: null,
        status: 'active',
    };

    if (data.organizationId !== undefined) {
        updateData.organizationId = data.organizationId;
    }

    return User.findOneAndUpdate({ _id: existing._id || existing.id }, updateData);
}

export const registerUser = async (userData: any) => {
    if (!config.security.allowOpenRegistration) {
        throw new ErrorResponse('Registration is invite-only. Contact your administrator.', 403);
    }

    const { name, email: rawEmail, password, organization_name, referred_by } = userData;
    const email = rawEmail.toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser && !existingUser.is_deleted) {
        throw new ErrorResponse('User already exists', 400);
    }

    if (existingUser?.is_deleted) {
        await RoleAssignment.removeAllForUser(existingUser._id.toString());
        const user = await reactivateDeletedUser(existingUser, { name, password });
        let organizationId: any = user.organization?.toString?.() || user.organization || undefined;

        if (organization_name) {
            const org = await Organization.create({
                name: organization_name,
                ownerId: user._id,
            });
            organizationId = org._id;
            await User.findOneAndUpdate(
                { _id: user._id },
                { organizationId: org._id }
            );
            user.organization = organizationId;
        }

        const roleSlug = organization_name ? 'org_admin' : 'normal_user';
        const targetRole = await Role.findOne({ slug: roleSlug });
        if (!targetRole) {
            throw new ErrorResponse('System error: Default roles not initialized', 500);
        }

        await RoleAssignment.create({
            userId: user._id,
            roleId: targetRole._id,
            scope: {
                type: targetRole.scopeType,
                organizationId: targetRole.scopeType === 'organization' ? organizationId : undefined,
            },
            assignedBy: user._id,
        });

        const tokens = generateTokenPair(user._id.toString());
        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                organization: user.organization,
            },
            ...tokens,
        };
    }

    let roleSlug = organization_name ? 'org_admin' : 'normal_user';

    const targetRole = await Role.findOne({ slug: roleSlug });
    if (!targetRole) {
        throw new ErrorResponse('System error: Default roles not initialized', 500);
    }

    // 1. Create User
    const user = await User.create({
        name,
        email,
        password
    });

    let organizationId: any = undefined;

    // 2. Organization Setup
    if (organization_name) {
        const org = await Organization.create({ 
            name: organization_name,
            ownerId: user._id
        });
        organizationId = org._id;
        
        user.organization = organizationId;
        await user.save();
    }

    // 3. Referral Logic
    if (referred_by) {
        try {
            // Find referrer (accepts ID or email)
            const referrer = await User.findOne({ 
                $or: [
                    { _id: referred_by },
                    { email: referred_by.toLowerCase().trim() }
                ]
            });

            if (referrer) {
                referrer.referral_count += 1;
                referrer.tokens += 5; // Reward referrer with 5 tokens
                await referrer.save();
                console.log(`🎁 [Referral] User ${referrer.email} rewarded with 5 tokens for referring ${user.email}`);
            }
        } catch (err) {
            console.error('[Referral] Failed to process referral:', err);
            // Don't fail registration if referral processing fails
        }
    }

    // 4. Role Assignment
    await RoleAssignment.create({
        userId: user._id,
        roleId: targetRole._id,
        scope: {
            type: targetRole.scopeType,
            organizationId: targetRole.scopeType === 'organization' ? organizationId : undefined
        },
        assignedBy: user._id
    });

    const tokens = generateTokenPair(user._id.toString());

        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                organization: user.organization,
                must_change_password: false,
            },
            ...tokens,
        };
};

export const loginUser = async (credentials: any) => {
    const { email, password } = credentials;

    const user = await User.findOne({ email: email.toLowerCase().trim() }, { select: 'password is_active is_deleted status' });

    if (!user) {
        throw new ErrorResponse('Invalid credentials', 401);
    }

    if (!user.is_active || user.is_deleted) {
        throw new ErrorResponse('Account is inactive or deleted', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new ErrorResponse('Invalid credentials', 401);
    }

    const tokens = generateTokenPair(user._id.toString());
    const permissionsSet = await getUserPermissions(user._id.toString());
    const permissions = Array.from(permissionsSet);

    const fullUser = await prisma.user.findUnique({ where: { id: user._id.toString() } });

    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            organization: user.organization,
            permissions,
            must_change_password: fullUser?.must_change_password ?? false,
        },
        ...tokens
    };
};

export const refreshUserToken = async (refreshToken: string) => {
    if (!refreshToken) {
        throw new ErrorResponse('Refresh token is required', 400);
    }

    try {
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;

        const user = await User.findById(decoded.id);
        if (!user || !user.is_active || user.is_deleted) {
            throw new ErrorResponse('User no longer exists or is inactive', 401);
        }

        const tokens = generateTokenPair(user._id.toString());

        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            ...tokens
        };
    } catch (err) {
        throw new ErrorResponse('Invalid refresh token', 401);
    }
};

export const getOrgUsers = async (currentUser: any, providedOrgId?: string) => {
    // 1. Get user's resolved permissions for the provided context
    const permissions = await getUserPermissions(currentUser._id.toString(), providedOrgId);

    // 2. Resolve the target organization
    // If user has global user:read authority and no org provided, return ALL users
    if (hasPermission(permissions, 'user:read') && !providedOrgId) {
        return await User.find({ is_deleted: false });
    }

    // Otherwise, we MUST have an org context (either provided or from user profile)
    const targetOrgId = providedOrgId || currentUser.organization?.toString();

    if (!targetOrgId) {
        throw new ErrorResponse('Organization context required', 400);
    }

    // Final security gate: if not a global admin, verify they belong to this org
    if (!hasPermission(permissions, 'user:read')) {
        throw new ErrorResponse('Not authorized to view users in this context', 403);
    }

    return await User.find({
        organization: targetOrgId,
        is_deleted: false
    });
};

export const addOrgUser = async (currentUser: any, userData: any) => {
    const orgId = currentUser.organization?.toString();

    if (!orgId) {
        throw new ErrorResponse('Organization context required to add users', 400);
    }

    const result = await createInvitedUser({
        name: userData.name,
        email: userData.email,
        organizationId: orgId,
        assignedById: currentUser._id.toString(),
        password: userData.password,
    });

    return {
        id: result.user._id,
        name: result.user.name,
        email: result.user.email,
        organization: result.user.organization,
        invite_email_sent: isEmailConfigured(),
        temp_password: result.tempPassword,
    };
};

export const updateUserAccess = async (currentUser: any, targetUserId: string, enabled: boolean) => {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
        throw new ErrorResponse('Target user not found', 404);
    }

    const permissions = await getUserPermissions(currentUser._id.toString());
    const isGlobalAdmin =
        hasPermission(permissions, '*') || hasPermission(permissions, 'user:update');

    if (
        !isGlobalAdmin &&
        targetUser.organization?.toString() !== currentUser.organization?.toString()
    ) {
        throw new ErrorResponse('Not authorized to modify users outside your organization', 403);
    }

    return await User.findOneAndUpdate(
        { _id: targetUserId },
        { lead_access_enabled: enabled }
    );
};

export const deactivateOrgUser = async (currentUser: any, targetUserId: string) => {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
        throw new ErrorResponse('Target user not found', 404);
    }

    if (targetUser._id.toString() === currentUser._id.toString()) {
        throw new ErrorResponse('Cannot deactivate your own account', 400);
    }

    const permissions = await getUserPermissions(currentUser._id.toString());
    const isGlobalAdmin =
        hasPermission(permissions, '*') || hasPermission(permissions, 'user:update');

    if (
        !isGlobalAdmin &&
        targetUser.organization?.toString() !== currentUser.organization?.toString()
    ) {
        throw new ErrorResponse('Not authorized to deactivate users outside your organization', 403);
    }

    await RoleAssignment.removeAllForUser(targetUserId);

    return await User.findOneAndUpdate(
        { _id: targetUserId },
        {
            is_deleted: true,
            is_active: false,
            lead_access_enabled: false,
            deleted_at: new Date(),
        }
    );
};

export const getUserOrganizations = async (currentUser: any) => {
    // 1. Get user's global permissions (without org context)
    const permissions = await getUserPermissions(currentUser._id.toString());

    // 2. If global org:read authority, return all organizations
    if (hasPermission(permissions, 'org:read')) {
        return await Organization.find({ is_deleted: false });
    }

    // 3. Otherwise, return only their assigned organization
    if (currentUser.organization) {
        return await Organization.find({
            _id: currentUser.organization,
            is_deleted: false
        });
    }

    return [];
};

export const requestPasswordReset = async (email: string) => {
    const normalized = email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
        where: { email: normalized, is_deleted: false, is_active: true },
    });

    // Always return success to avoid email enumeration
    if (!user) {
        return { message: 'If that email exists, a reset link has been sent.' };
    }

    const rawToken = generateSecureToken();
    const hashed = hashToken(rawToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password_reset_token: hashed,
            password_reset_expires: expires,
        },
    });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    const { subject, html } = buildPasswordResetEmail(resetUrl);

    if (isEmailConfigured()) {
        await sendEmail({ to: user.email, subject, html });
    } else if (config.env !== 'production') {
        console.log(`[Dev] Password reset link for ${user.email}: ${resetUrl}`);
    }

    return { message: 'If that email exists, a reset link has been sent.' };
};

export const resetPassword = async (token: string, newPassword: string) => {
    if (!token || !newPassword || newPassword.length < 6) {
        throw new ErrorResponse('Valid token and password (min 6 chars) required', 400);
    }

    const hashed = hashToken(token);
    const user = await prisma.user.findFirst({
        where: {
            password_reset_token: hashed,
            password_reset_expires: { gt: new Date() },
            is_deleted: false,
        },
    });

    if (!user) {
        throw new ErrorResponse('Invalid or expired reset token', 400);
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: await hashPassword(newPassword),
            password_reset_token: null,
            password_reset_expires: null,
            must_change_password: false,
        },
    });

    return { message: 'Password updated successfully' };
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await User.findOne({ _id: userId }, { select: 'password' });
    if (!user) throw new ErrorResponse('User not found', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new ErrorResponse('Current password is incorrect', 401);

    if (!newPassword || newPassword.length < 6) {
        throw new ErrorResponse('New password must be at least 6 characters', 400);
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            password: await hashPassword(newPassword),
            must_change_password: false,
        },
    });

    return { message: 'Password changed successfully' };
};

export async function createInvitedUser(options: {
    name: string;
    email: string;
    organizationId: string;
    assignedById: string;
    roleSlug?: string;
    password?: string;
}) {
    const email = options.email.toLowerCase().trim();
    const tempPassword = options.password?.trim() || generateTempPassword();
    const mustChange = !options.password?.trim();

    let user = await User.findOne({ email });

    if (user && !user.is_deleted) {
        throw new ErrorResponse('User already exists in the system.', 400);
    }

    if (user?.is_deleted) {
        await RoleAssignment.removeAllForUser(user._id.toString());
        user = await User.findOneAndUpdate(
            { _id: user._id },
            {
                name: options.name,
                password: await hashPassword(tempPassword),
                organizationId: options.organizationId,
                is_deleted: false,
                is_active: true,
                lead_access_enabled: true,
                deleted_at: null,
                status: 'active',
                must_change_password: mustChange,
            }
        );
    } else {
        user = await User.create({
            name: options.name,
            email,
            password: tempPassword,
            organization: options.organizationId,
        });
        await prisma.user.update({
            where: { id: user._id.toString() },
            data: { must_change_password: mustChange },
        });
    }

    const role = await Role.findOne({ slug: options.roleSlug || 'org_user' });
    if (!role) throw new ErrorResponse('Invalid role specified.', 400);

    await RoleAssignment.create({
        userId: user._id,
        roleId: role._id,
        scope: { type: 'organization', organizationId: options.organizationId },
        assignedBy: options.assignedById,
    });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const loginUrl = `${frontendUrl}/login`;

    if (isEmailConfigured()) {
        const { subject, html } = buildInviteEmail(options.name, email, tempPassword, loginUrl);
        await sendEmail({ to: email, subject, html });
    }

    return {
        user,
        role,
        tempPassword: isEmailConfigured() ? undefined : tempPassword,
    };
}
