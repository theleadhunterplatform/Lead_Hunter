import request from 'supertest';
import express from 'express';
import * as dbHandler from './setup';
import authRoutes from '../routes/auth.routes';
import adminRoutes from '../routes/admin.routes';
import errorHandler from '../middleware/error';
import User from '../models/user.model';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

beforeAll(async () => {
    process.env.REQUIRE_SIGNUP_APPROVAL = 'true';
    await dbHandler.connect();
    await dbHandler.clear();
});

afterAll(async () => await dbHandler.close());
afterEach(async () => await dbHandler.clear());

async function loginAsAdmin() {
    const admin = await User.findOne({ email: 'admin@leadhunter.com' });
    if (!admin) throw new Error('Default admin not seeded');

    const res = await request(app).post('/api/auth/login').send({
        email: 'admin@leadhunter.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    });

    return res.body.data.access_token as string;
}

describe('Signup approval flow', () => {
    it('registers as pending without tokens', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Pending User',
            email: 'pending@example.com',
            password: 'password123',
        });

        expect(res.status).toBe(201);
        expect(res.body.data.approval_required).toBe(true);
        expect(res.body.data.user.status).toBe('pending');
        expect(res.body.data.access_token).toBeUndefined();

        const loginRes = await request(app).post('/api/auth/login').send({
            email: 'pending@example.com',
            password: 'password123',
        });

        expect(loginRes.status).toBe(403);
        expect(loginRes.body.error).toMatch(/pending admin approval/i);
    });

    it('allows admin to approve pending user then login', async () => {
        const registerRes = await request(app).post('/api/auth/register').send({
            name: 'Approve Me',
            email: 'approveme@example.com',
            password: 'password123',
        });

        const userId = registerRes.body.data.user.id;
        const adminToken = await loginAsAdmin();

        const listRes = await request(app)
            .get('/api/admin/users/pending')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(listRes.status).toBe(200);
        expect(listRes.body.data.some((u: any) => u.id === userId)).toBe(true);

        const approveRes = await request(app)
            .post(`/api/admin/users/${userId}/approve`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(approveRes.status).toBe(200);
        expect(approveRes.body.data.status).toBe('active');

        const loginRes = await request(app).post('/api/auth/login').send({
            email: 'approveme@example.com',
            password: 'password123',
        });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body.data).toHaveProperty('access_token');
    });

    it('allows admin to reject pending user', async () => {
        const registerRes = await request(app).post('/api/auth/register').send({
            name: 'Reject Me',
            email: 'rejectme@example.com',
            password: 'password123',
        });

        const userId = registerRes.body.data.user.id;
        const adminToken = await loginAsAdmin();

        const rejectRes = await request(app)
            .post(`/api/admin/users/${userId}/reject`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ reason: 'Test rejection' });

        expect(rejectRes.status).toBe(200);
        expect(rejectRes.body.data.status).toBe('rejected');

        const loginRes = await request(app).post('/api/auth/login').send({
            email: 'rejectme@example.com',
            password: 'password123',
        });

        expect(loginRes.status).toBe(403);
        expect(loginRes.body.error).toMatch(/rejected/i);
    });

    it('blocks non-admin from pending list', async () => {
        const registerRes = await request(app).post('/api/auth/register').send({
            name: 'Normal User',
            email: 'normal@example.com',
            password: 'password123',
        });

        const userId = registerRes.body.data.user.id;
        const adminToken = await loginAsAdmin();

        await request(app)
            .post(`/api/admin/users/${userId}/approve`)
            .set('Authorization', `Bearer ${adminToken}`);

        const userLogin = await request(app).post('/api/auth/login').send({
            email: 'normal@example.com',
            password: 'password123',
        });

        expect(userLogin.status).toBe(200);
        const userToken = userLogin.body.data.access_token;

        const listRes = await request(app)
            .get('/api/admin/users/pending')
            .set('Authorization', `Bearer ${userToken}`);

        expect(listRes.status).toBe(403);
    });
});
