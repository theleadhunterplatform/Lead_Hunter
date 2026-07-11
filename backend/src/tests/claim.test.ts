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
import Claim from '../models/claim.model';

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
        tokens
    });

    const role = await Role.findOne({ slug: 'normal_user' });
    if (role) {
        await RoleAssignment.create({
            userId: user._id,
            roleId: role._id,
            scope: { type: 'global', organizationId: null },
            assignedBy: user._id
        });
    }

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });

    return { token: loginRes.body.data.access_token, user };
}

describe('Lead Claiming Integration Tests', () => {
    let leadId: string;

    beforeEach(async () => {
        const lead = await LeadPost.create({
            post_id: 'test-lead-1',
            url: 'https://test.com/1',
            content: 'I need a web developer',
            platform: 'linkedin',
            keyword: 'web dev',
            status: 'relevant',
            review_status: 'approved',
            intelligence: 'Found a high-value signal for web development services.'
        });
        leadId = lead._id.toString();
    });

    it('should claim a lead successfully and deduct tokens', async () => {
        const { token } = await setupUser('user1@test.com', 10);

        const res = await request(app)
            .post(`/api/posts/${leadId}/claim`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.remaining_tokens).toBe(9);
        expect(res.body.data.claimed_count).toBe(1);

        const claim = await Claim.findOne({ leadId });
        expect(claim).toBeTruthy();
    });

    it('should fail if user has already claimed the lead', async () => {
        const { token } = await setupUser('user2@test.com', 10);

        // First claim
        await request(app)
            .post(`/api/posts/${leadId}/claim`)
            .set('Authorization', `Bearer ${token}`);

        // Second claim
        const res = await request(app)
            .post(`/api/posts/${leadId}/claim`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/already claimed/i);
    });

    it('should fail if user has insufficient tokens', async () => {
        const { token } = await setupUser('user3@test.com', 0);

        const res = await request(app)
            .post(`/api/posts/${leadId}/claim`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/insufficient tokens/i);
    });

    it('should fail if lead reached claim limit (25 users)', async () => {
        const { token } = await setupUser('user4@test.com', 10);
        
        // Artificially set claim count to 25
        await LeadPost.findByIdAndUpdate(leadId, { claimed_count: 25 });

        const res = await request(app)
            .post(`/api/posts/${leadId}/claim`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/maximum claim limit/i);
    });

    it('should list only claimed leads for the user', async () => {
        const { token } = await setupUser('user5@test.com', 10);

        // Claim it
        await request(app)
            .post(`/api/posts/${leadId}/claim`)
            .set('Authorization', `Bearer ${token}`);

        const res = await request(app)
            .get('/api/posts/claimed')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(1);
        // The data returned is an array of claims, where each claim has a populated leadId
        expect(res.body.data[0].leadId._id.toString()).toBe(leadId);
    });
});
