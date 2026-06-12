import request from 'supertest';
import express from 'express';
import * as dbHandler from './setup';
import authRoutes from '../routes/auth.routes';
import settingRoutes from '../routes/setting.routes';
import apifyKeyRoutes from '../routes/apify-key.routes';
import rbacRoutes from '../routes/rbac.routes';
import errorHandler from '../middleware/error';
import User from '../models/user.model';
import Role from '../models/role.model';
import RoleAssignment from '../models/role-assignment.model';
import AuditLog from '../models/audit-log.model';
import ApifyKey from '../models/apify-key.model';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/apify-keys', apifyKeyRoutes);
app.use('/api/rbac', rbacRoutes);
app.use(errorHandler);

beforeAll(async () => await dbHandler.connect());
afterAll(async () => await dbHandler.close());
afterEach(async () => await dbHandler.clear());

async function setupAdmin(email: string) {
    const role = await Role.findOne({ slug: 'system_owner' });
    const user = await User.create({
        name: 'Admin User',
        email,
        password: 'password123'
    });

    await RoleAssignment.create({
        userId: user._id,
        roleId: role!._id,
        scope: { type: 'global', organizationId: null },
        assignedBy: user._id
    });

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });

    return loginRes.body.data.access_token;
}

describe('System & Admin Integration Tests', () => {
    let token: string;

    beforeEach(async () => {
        token = await setupAdmin('admin@system.com');
    });

    describe('Settings Management (Contact Compass)', () => {
        it('should update and retrieve contact compass token', async () => {
            const updateRes = await request(app)
                .post('/api/settings/contact-compass-token')
                .set('Authorization', `Bearer ${token}`)
                .send({ token: 'new-secret-token' });

            expect(updateRes.status).toBe(200);

            const getRes = await request(app)
                .get('/api/settings/contact-compass-token')
                .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(200);
            expect(getRes.body.data.token).toBe('new-...oken');
        });
    });

    describe('Apify Key Management', () => {
        it('should add, list, and delete apify keys', async () => {
            // Add
            const addRes = await request(app)
                .post('/api/apify-keys')
                .set('Authorization', `Bearer ${token}`)
                .send({ key: 'apify_test_key', label: 'Primary Key' });

            expect(addRes.status).toBe(201);
            const keyId = addRes.body.data._id;

            // List
            const listRes = await request(app)
                .get('/api/apify-keys')
                .set('Authorization', `Bearer ${token}`);

            expect(listRes.status).toBe(200);
            expect(listRes.body.data.some((k: any) => k.key === 'apify_test_key')).toBe(true);

            // Delete
            const delRes = await request(app)
                .delete(`/api/apify-keys/${keyId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(delRes.status).toBe(200);
            
            const check = await ApifyKey.findById(keyId);
            expect(check?.is_deleted).toBe(true);
        });
    });

    describe('Audit Logging', () => {
        it('should create an audit log when a role is created', async () => {
            await request(app)
                .post('/api/rbac/roles')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Temporary Role',
                    slug: 'temp_role',
                    permissions: ['test:perm'],
                    scopeType: 'global'
                });

            const logs = await AuditLog.find({ action: 'role:create' });
            expect(logs.length).toBeGreaterThan(0);
            expect(logs[0].resource).toBe('role');
        });
    });
});
