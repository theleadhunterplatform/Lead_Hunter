import request from 'supertest';
import express from 'express';
import * as dbHandler from './setup';
import authRoutes from '../routes/auth.routes';
import rbacRoutes from '../routes/rbac.routes';
import errorHandler from '../middleware/error';
import User from '../models/user.model';
import Role from '../models/role.model';
import RoleAssignment from '../models/role-assignment.model';
import Organization from '../models/organization.model';
import { getUserPermissions } from '../utils/rbac.utils';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/rbac', rbacRoutes);
app.use(errorHandler);

beforeAll(async () => await dbHandler.connect());
afterAll(async () => await dbHandler.close());
afterEach(async () => await dbHandler.clear());

async function setupUserWithRole(email: string, roleSlug: string, orgName?: string) {
    const role = await Role.findOne({ slug: roleSlug });
    if (!role) throw new Error(`Role ${roleSlug} not found`);

    const user: any = await User.create({
        name: `${roleSlug} User`,
        email,
        password: 'password123',
    });

    let organizationId = null;
    if (orgName) {
        const org = await Organization.create({
            name: orgName,
            ownerId: user._id,
        });
        organizationId = org._id;
        user.organization = organizationId;
        await user.save();
    }

    await RoleAssignment.create({
        userId: user._id,
        roleId: role._id,
        scope: {
            type: role.scopeType,
            organizationId: role.scopeType === 'organization' ? organizationId : null
        },
        assignedBy: user._id
    });

    return user;
}

describe('RBAC Role & Permission Tests', () => {

    describe('Superadmin (system_owner) Login & Permissions', () => {
        it('should have wildcard (*) permissions', async () => {
            await setupUserWithRole('superadmin@test.com', 'system_owner');
            
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'superadmin@test.com', password: 'password123' });

            const token = loginRes.body.data.access_token;
            
            const permRes = await request(app)
                .get('/api/rbac/my-permissions')
                .set('Authorization', `Bearer ${token}`);

            expect(permRes.status).toBe(200);
            expect(permRes.body.data.permissions).toContain('*');
        });
    });

    describe('Internal Operative (internal_user) Login & Permissions', () => {
        it('should have platform management permissions with wildcard', async () => {
            await setupUserWithRole('internal@test.com', 'internal_user');
            
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'internal@test.com', password: 'password123' });

            const token = loginRes.body.data.access_token;
            
            const permRes = await request(app)
                .get('/api/rbac/my-permissions')
                .set('Authorization', `Bearer ${token}`);

            expect(permRes.status).toBe(200);
            expect(permRes.body.data.permissions).toContain('*');
            expect(permRes.body.data.role.slug).toBe('internal_user');
        });
    });

    describe('Organization Admin (org_admin) Login & Permissions', () => {
        it('should have organization management permissions', async () => {
            const user = await setupUserWithRole('orgadmin@test.com', 'org_admin', 'Test Agency');
            
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'orgadmin@test.com', password: 'password123' });

            const token = loginRes.body.data.access_token;
            
            const permRes = await request(app)
                .get('/api/rbac/my-permissions')
                .set('Authorization', `Bearer ${token}`)
                .set('x-org-id', (user as any).organization.toString());

            expect(permRes.status).toBe(200);
            expect(permRes.body.data.permissions).toContain('lead:hunt');
            expect(permRes.body.data.permissions).not.toContain('*');
            expect(permRes.body.data.role.slug).toBe('org_admin');
        });

        it('does not grant platform wildcard to org owners via x-org-id', async () => {
            const user = await setupUserWithRole('orgowner-star@test.com', 'org_admin', 'Owner Agency');
            const perms = await getUserPermissions(
                (user as any)._id.toString(),
                (user as any).organization.toString()
            );

            expect(perms.has('*')).toBe(false);
            expect(perms.has('lead:hunt')).toBe(true);
        });
    });

    describe('Organization User (org_user) Login & Permissions', () => {
        it('should have basic organization access', async () => {
            const user = await setupUserWithRole('orguser@test.com', 'org_user', 'Test Agency');
            
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'orguser@test.com', password: 'password123' });

            const token = loginRes.body.data.access_token;
            
            const permRes = await request(app)
                .get('/api/rbac/my-permissions')
                .set('Authorization', `Bearer ${token}`)
                .set('x-org-id', (user as any).organization.toString());

            expect(permRes.status).toBe(200);
            expect(permRes.body.data.permissions).toContain('lead:read');
            expect(permRes.body.data.permissions).not.toContain('user:create');
        });
    });

    describe('Individual User (normal_user) Login & Permissions', () => {
        it('should have standard global user permissions', async () => {
            await setupUserWithRole('normal@test.com', 'normal_user');
            
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'normal@test.com', password: 'password123' });

            const token = loginRes.body.data.access_token;
            
            const permRes = await request(app)
                .get('/api/rbac/my-permissions')
                .set('Authorization', `Bearer ${token}`);

            expect(permRes.status).toBe(200);
            expect(permRes.body.data.permissions).toContain('lead:read');
            expect(permRes.body.data.permissions).toContain('lead:claim');
            expect(permRes.body.data.permissions).not.toContain('lead:hunt');
            expect(permRes.body.data.role.slug).toBe('normal_user');
        });
    });

});
