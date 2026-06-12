import { Request, Response, NextFunction } from 'express';
import Role from '../models/role.model';
import User from '../models/user.model';
import RoleAssignment from '../models/role-assignment.model';
import ErrorResponse from '../utils/error-response.utils';
import asyncHandler from '../middleware/async';
import { getUserPermissions, hasPermission } from '../utils/rbac.utils';
import { logAction } from '../utils/audit.utils';

// @desc    Get all roles
// @route   GET /api/rbac/roles
// @access  Private/Admin
export const getRoles = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const roles = await Role.find();
    res.status(200).json({
        success: true,
        data: roles
    });
});

// @desc    Create a role
// @route   POST /api/rbac/roles
// @access  Private/Admin
export const createRole = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const role = await Role.create(req.body);

    await logAction(req, {
        action: 'role:create',
        resource: 'role',
        resourceId: role._id.toString(),
        details: { name: role.name, permissions: role.permissions }
    });

    res.status(201).json({
        success: true,
        data: role
    });
});

// @desc    Update a role
// @route   PUT /api/rbac/roles/:id
// @access  Private/Admin
export const updateRole = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const roleId = String(req.params.id);
    let role = await Role.findById(roleId);

    if (!role) {
        return next(new ErrorResponse('Role not found', 404));
    }

    const oldPermissions = [...role.permissions];

    role = await Role.findByIdAndUpdate(roleId, req.body, {
        new: true,
        runValidators: true
    });

    await logAction(req, {
        action: 'role:update',
        resource: 'role',
        resourceId: role!._id.toString(),
        details: { 
            name: role!.name, 
            permissions: role!.permissions,
            previousPermissions: oldPermissions
        }
    });

    res.status(200).json({
        success: true,
        data: role
    });
});

// @desc    Assign Role to User
// @route   POST /api/rbac/role-assignments
// @access  Private/Admin
export const createRoleAssignment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, roleId, scope, expiresAt } = req.body;
    const requester = req.user as any;

    // 1. Verify user and role exist
    const [user, role] = await Promise.all([
        User.findById(userId),
        Role.findById(roleId)
    ]);

    if (!user) return next(new ErrorResponse('User not found', 404));
    if (!role) return next(new ErrorResponse('Role not found', 404));

    // 2. AUTHORITY VALIDATION (CRITICAL)
    const reqOrgId = scope?.type === 'organization' ? scope.organizationId : null;
    const requesterPerms = await getUserPermissions(requester.id, reqOrgId);

    if (!hasPermission(requesterPerms, 'role:assign')) {
        return next(new ErrorResponse('You do not have authority to assign roles in this scope', 403));
    }

    if (role.scopeType !== scope?.type) {
        return next(new ErrorResponse(`Cannot assign a ${role.scopeType} role to a ${scope?.type} scope`, 400));
    }

    const assignment = await RoleAssignment.create({
        userId,
        roleId,
        scope,
        assignedBy: requester.id,
        expiresAt: expiresAt || null
    });

    await logAction(req, {
        action: 'role:assign',
        resource: 'role_assignment',
        resourceId: assignment._id.toString(),
        details: { 
            targetUserId: userId, 
            roleName: role.name, 
            scope,
            expiresAt 
        }
    });

    res.status(201).json({
        success: true,
        data: assignment
    });
});

// @desc    Get Role Assignments
// @route   GET /api/rbac/role-assignments
// @access  Private/Admin
export const getRoleAssignments = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { userId, orgId } = req.query;
    const requester = req.user as any;
    
    const query: any = {};
    if (userId) query.userId = userId;

    const requesterPerms = await getUserPermissions(requester.id, (orgId as string) || null);
    
    if (!hasPermission(requesterPerms, 'role:read')) {
        return next(new ErrorResponse('Unauthorized to view assignments in this scope', 403));
    }

    if (orgId) {
        query['scope.organizationId'] = orgId;
    }

    const assignments = await RoleAssignment.find(query, { populate: ['roleId', 'userId'] });

    res.status(200).json({
        success: true,
        data: assignments
    });
});

// @desc    Get Current User Permissions
// @route   GET /api/rbac/my-permissions
// @access  Private
export const getMyPermissions = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = req.user as any;
    const orgId = req.headers['x-org-id'] as string || null;

    const query: any = {
        userId: user.id,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    };

    if (orgId) {
        query.$or = [
            { 'scope.type': 'global' },
            { 'scope.type': 'organization', 'scope.organizationId': orgId }
        ];
    } else {
        query['scope.type'] = 'global';
    }

    const assignments = await RoleAssignment.find(query, { populate: 'roleId' });
    const permissions = new Set<string>();
    let primaryRole: any = null;

    assignments.forEach((assignment: any) => {
        if (assignment.roleId) {
            assignment.roleId.permissions.forEach((p: string) => permissions.add(p));
            // Favor global roles or the first one found
            if (!primaryRole || assignment.scope.type === 'global') {
                primaryRole = assignment.roleId;
            }
        }
    });
    
    res.status(200).json({
        success: true,
        data: {
            permissions: Array.from(permissions),
            role: primaryRole
        }
    });
});

// @desc    Revoke Role Assignment
// @route   DELETE /api/rbac/role-assignments/:id
// @access  Private/Admin
export const deleteRoleAssignment = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const assignment = await RoleAssignment.findById(String(req.params.id), { populate: 'roleId' });
    const requester = req.user as any;

    if (!assignment) {
        return next(new ErrorResponse('Assignment not found', 404));
    }

    const targetOrgId = assignment.scope?.type === 'organization' ? assignment.scope.organizationId : null;
    const requesterPerms = await getUserPermissions(requester.id, targetOrgId as any);

    if (!hasPermission(requesterPerms, 'role:assign')) {
        return next(new ErrorResponse('Unauthorized to revoke this assignment', 403));
    }

    await logAction(req, {
        action: 'role:revoke',
        resource: 'role_assignment',
        resourceId: assignment._id.toString(),
        details: { 
            targetUserId: assignment.userId, 
            roleName: (assignment.roleId as any)?.name,
            scope: assignment.scope 
        }
    });

    await RoleAssignment.removeById(assignment._id || assignment.id);

    res.status(200).json({
        success: true,
        data: {}
    });
});
