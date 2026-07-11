import Organization from '../models/organization.model';
import Role from '../models/role.model';
import RoleAssignment from '../models/role-assignment.model';
import { isValidId } from '../utils/serialize.utils';

/**
 * Resolves all permissions for a user within a given scope.
 * Org owners do NOT get platform wildcard `*` — they use their role (org_admin).
 */
export async function getUserPermissions(userId: string, organizationId: string | null = null): Promise<Set<string>> {
    const permissions = new Set<string>();

    const query: any = {
        userId,
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    };

    if (organizationId && isValidId(organizationId.toString())) {
        query.$or = [
            { 'scope.type': 'global' },
            {
                'scope.type': 'organization',
                'scope.organizationId': organizationId.toString()
            }
        ];
    } else {
        query['scope.type'] = 'global';
    }

    const assignments = await RoleAssignment.find(query, { populate: 'roleId' });

    assignments.forEach((assignment: any) => {
        if (assignment.roleId && assignment.roleId.permissions) {
            const rolePerms = Array.isArray(assignment.roleId.permissions)
                ? assignment.roleId.permissions
                : [];
            rolePerms.forEach((perm: string) => {
                permissions.add(perm);
            });
        }
    });

    // Org owner fallback: grant org_admin permissions if they have no role assignment yet.
    // Never grant platform `*`.
    if (
        permissions.size === 0
        && organizationId
        && isValidId(organizationId.toString())
    ) {
        const org = await Organization.findById(organizationId);
        if (org && org.ownerId?.toString() === userId.toString()) {
            const orgAdmin = await Role.findOne({ slug: 'org_admin' });
            const rolePerms = Array.isArray(orgAdmin?.permissions) ? orgAdmin.permissions : [];
            rolePerms.forEach((perm: string) => permissions.add(perm));
        }
    }

    return permissions;
}

/**
 * Matcher logic for wildcard permissions
 */
export function hasPermission(userPerms: Set<string>, required: string): boolean {
    if (userPerms.has('*')) return true;

    if (userPerms.has(required)) return true;

    const [resource] = required.split(':');
    if (userPerms.has(`${resource}:*`)) return true;

    return false;
}
