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

async function setupUser(email: string, tokens: number = 10) {
    const user = await User.create({
        name: 'Test User',
        email,
        password: 'password123',
        tokens,
    });

    const role = await Role.findOne({ slug: 'normal_user' });
    if (role) {
        await RoleAssignment.create({
            userId: user._id,
            roleId: role._id,
            scope: { type: 'global', organizationId: null },
            assignedBy: user._id,
        });
    }

    const loginRes = await request(app).post('/api/auth/login').send({
        email,
        password: 'password123',
    });

    return { token: loginRes.body.data.access_token, user };
}

describe('Reproduce 500 Error', () => {
    it('should claim a lead without 500', async () => {
        const { token } = await setupUser('test@example.com', 10);
        
        const lead = await LeadPost.create({
            post_id: 'test-lead',
            url: 'https://example.com/test-lead',
            content: 'Sample content',
            keyword: 'test-keyword',
            status: 'relevant',
            review_status: 'approved',
            intelligence: 'Sample intel',
            email: 'lead@example.com',
        } as any);

        const res = await request(app)
            .post(`/api/posts/${lead._id}/claim`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
    });
});
