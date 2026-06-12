import request from 'supertest';
import express from 'express';
import * as dbHandler from './setup';
import authRoutes from '../routes/auth.routes';
import postRoutes from '../routes/post.routes';
import errorHandler from '../middleware/error';
import User from '../models/user.model';
import Role from '../models/role.model';
import RoleAssignment from '../models/role-assignment.model';
import LeadPost from '../models/lead-post.model';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use(errorHandler);

beforeAll(async () => await dbHandler.connect());
afterAll(async () => await dbHandler.close());
afterEach(async () => await dbHandler.clear());

async function setupAuth(email: string) {
    const role = await Role.findOne({ slug: 'internal_user' });
    const user = await User.create({
        name: 'Lead Tester',
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

describe('Lead (Post) Management Integration Tests', () => {
    let token: string;

    beforeEach(async () => {
        token = await setupAuth('lead-tester@test.com');
    });

    describe('GET /api/posts', () => {
        it('should list all leads', async () => {
            await LeadPost.create({
                post_id: '123',
                url: 'http://test.com/123',
                content: 'Test content',
                platform: 'linkedin',
                keyword: 'SaaS'
            });

            const res = await request(app)
                .get('/api/posts')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].post_id).toBe('123');
        });
    });

    describe('PUT /api/posts/:id/label', () => {
        it('should update lead status', async () => {
            const lead = await LeadPost.create({
                post_id: '456',
                url: 'http://test.com/456',
                content: 'Test content',
                platform: 'linkedin',
                keyword: 'SaaS',
                status: 'pending'
            });

            const res = await request(app)
                .put(`/api/posts/${lead._id}/label`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'relevant' });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('relevant');
        });
    });

    describe('DELETE /api/posts/:id', () => {
        it('should soft delete the lead', async () => {
            const lead = await LeadPost.create({
                post_id: '789',
                url: 'http://test.com/789',
                content: 'Test content',
                platform: 'linkedin',
                keyword: 'SaaS',
                status: 'relevant'
            });

            const res = await request(app)
                .delete(`/api/posts/${lead._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            
            const check = await LeadPost.findById(lead._id);
            expect(check?.is_deleted).toBe(true);
        });
    });

    describe('POST /api/posts/bulk-ingest', () => {
        it('should ingest multiple leads (public endpoint)', async () => {
            const leads = [
                {
                    post_id: 'b1',
                    url: 'http://test.com/b1',
                    content: 'Bulk 1',
                    platform: 'linkedin',
                    keyword: 'SaaS',
                    author: { name: 'John Doe' }
                },
                {
                    post_id: 'b2',
                    url: 'http://test.com/b2',
                    content: 'Bulk 2',
                    platform: 'linkedin',
                    keyword: 'SaaS',
                    author: { name: 'Jane Smith' }
                }
            ];

            const res = await request(app)
                .post('/api/posts/bulk-ingest')
                .send({ posts: leads });

            expect(res.status).toBe(201);
            expect(res.body.count).toBe(2);
            
            const count = await LeadPost.countDocuments();
            expect(count).toBe(2);
        });
    });
});
