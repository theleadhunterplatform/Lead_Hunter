import request from 'supertest';
import express from 'express';
import * as dbHandler from './setup';
import authRoutes from '../routes/auth.routes';
import keywordRoutes from '../routes/keyword.routes';
import errorHandler from '../middleware/error';
import User from '../models/user.model';
import Role from '../models/role.model';
import RoleAssignment from '../models/role-assignment.model';
import Keyword from '../models/keyword.model';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/keywords', keywordRoutes);
app.use(errorHandler);

beforeAll(async () => await dbHandler.connect());
afterAll(async () => await dbHandler.close());
afterEach(async () => await dbHandler.clear());

async function setupAuth(email: string, roleSlug: string = 'internal_user') {
    const role = await Role.findOne({ slug: roleSlug });
    const user = await User.create({
        name: 'Test User',
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

describe('Keyword Management Integration Tests', () => {
    let token: string;

    beforeEach(async () => {
        token = await setupAuth('keyword-tester@test.com', 'internal_user');
    });

    describe('POST /api/keywords', () => {
        it('should create a new keyword successfully', async () => {
            const res = await request(app)
                .post('/api/keywords')
                .set('Authorization', `Bearer ${token}`)
                .send({ text: 'SaaS Founder', platforms: ['linkedin', 'twitter'] });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.text).toBe('SaaS Founder');
            
            const kw = await Keyword.findOne({ text: 'SaaS Founder' });
            expect(kw).toBeDefined();
        });

        it('should fail if keyword text is missing', async () => {
            const res = await request(app)
                .post('/api/keywords')
                .set('Authorization', `Bearer ${token}`)
                .send({ platforms: ['linkedin'] });

            expect(res.status).toBe(400);
        });

        it('should fail if keyword already exists', async () => {
            await request(app)
                .post('/api/keywords')
                .set('Authorization', `Bearer ${token}`)
                .send({ text: 'Duplicate' });

            const res = await request(app)
                .post('/api/keywords')
                .set('Authorization', `Bearer ${token}`)
                .send({ text: 'Duplicate' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/already exists/i);
        });
    });

    describe('GET /api/keywords', () => {
        it('should list all active keywords', async () => {
            await Keyword.create({ text: 'KW1' });
            await Keyword.create({ text: 'KW2' });
            await Keyword.create({ text: 'Deleted', is_deleted: true });

            const res = await request(app)
                .get('/api/keywords')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(2);
            expect(res.body.data.some((k: any) => k.text === 'KW1')).toBe(true);
            expect(res.body.data.some((k: any) => k.text === 'Deleted')).toBe(false);
        });
    });

    describe('PUT /api/keywords/:id', () => {
        it('should update keyword text and platforms', async () => {
            const kw = await Keyword.create({ text: 'Original', platforms: ['linkedin'] });

            const res = await request(app)
                .put(`/api/keywords/${kw._id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ text: 'Updated', platforms: ['twitter'] });

            expect(res.status).toBe(200);
            expect(res.body.data.text).toBe('Updated');
            expect(res.body.data.platforms).toContain('twitter');
        });
    });

    describe('DELETE /api/keywords/:id', () => {
        it('should soft delete the keyword', async () => {
            const kw = await Keyword.create({ text: 'To Delete' });

            const res = await request(app)
                .delete(`/api/keywords/${kw._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            
            const check = await Keyword.findById(kw._id);
            expect(check?.is_deleted).toBe(true);
            expect(check?.is_active).toBe(false);
        });
    });

    describe('POST /api/keywords/bulk', () => {
        it('should add multiple keywords at once', async () => {
            const res = await request(app)
                .post('/api/keywords/bulk')
                .set('Authorization', `Bearer ${token}`)
                .send({ 
                    texts: ['Bulk 1', 'Bulk 2', ''], 
                    platforms: ['reddit'] 
                });

            expect(res.status).toBe(201);
            expect(res.body.count).toBe(2);
            expect(res.body.data[0].platforms).toContain('reddit');
        });
    });
});
