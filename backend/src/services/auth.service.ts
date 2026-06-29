import User from '../models/user.model';
import Role from '../models/role.model';
import Organization from '../models/organization.model';
import RoleAssignment from '../models/role-assignment.model';
import ErrorResponse from '../utils/error-response.utils';
import { generateTokenPair } from '../utils/token.utils';
import jwt from 'jsonwebtoken';
import config from '../config';
import { getUserPermissions, hasPermission } from '../utils/rbac.utils';

export const registerUser = async (userData: any) => {
    const { name, email: rawEmail, password, organization_name, referred_by } = userData;
    const email = rawEmail.toLowerCase().trim();

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new ErrorResponse('User already exists', 400);
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
            organization: user.organization
        },
        ...tokens
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

    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            organization: user.organization,
            permissions // Include permissions in login response for frontend speed
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
    const { name, email, password } = userData;
    const orgId = currentUser.organization?.toString();

    if (!orgId) {
        throw new ErrorResponse('Organization context required to add users', 400);
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        throw new ErrorResponse('User already exists', 400);
    }

    const userRole = await Role.findOne({ slug: 'org_user' }) || await Role.findOne({ slug: 'user' });
    if (!userRole) {
        throw new ErrorResponse('System error: User roles not initialized', 500);
    }

    const user = await User.create({
        name,
        email,
        password,
        organization: orgId
    });

    // Assign default role within the organization
    await RoleAssignment.create({
        userId: user._id,
        roleId: userRole._id,
        scope: {
            type: 'organization',
            organizationId: orgId
        }
    });

    return {
        id: user._id,
        name: user.name,
        email: user.email,
        organization: user.organization
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
