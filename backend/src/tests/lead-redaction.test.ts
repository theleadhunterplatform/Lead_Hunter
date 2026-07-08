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
        name: 'Redaction User',
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

describe('Lead contact redaction flow', () => {
    let leadId: string;

    beforeEach(async () => {
        const lead = await LeadPost.create({
            post_id: 'redaction-lead-1',
            url: 'https://linkedin.com/posts/redaction-lead-1',
            source_profile: 'https://linkedin.com/in/person',
            content: 'Looking for a growth marketer for my SaaS.',
            platform: 'linkedin',
            keyword: 'growth',
            status: 'relevant',
            review_status: 'approved',
            intelligence: 'Approved high-value lead.',
            email: 'lead@example.com',
            contact_info: {
                name: 'Lead Contact',
                email_status: 'verified',
                phone_numbers: [{ number: '+1-555-111-2222', type: 'mobile' }],
            },
            raw_result: {
                profile_url: 'https://linkedin.com/in/person',
            },
        } as any);

        leadId = lead._id.toString();
    });

    it('hides contact details for unclaimed lead detail', async () => {
        const { token } = await setupUser('redaction-unclaimed@test.com', 10);

        const res = await request(app)
            .get(`/api/posts/${leadId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.is_claimed).toBe(false);
        expect(res.body.data.email).toBeNull();
        expect(res.body.data.contact_info).toBeNull();
        expect(res.body.data.url).toBe('#');
        expect(res.body.data.source_profile).toBe('locked');
        expect(res.body.data.raw_result).toBeUndefined();
        expect(res.body.data.author?.handle).toBe('locked');
    });

    it('reveals contact details after claim in list and detail', async () => {
        const { token } = await setupUser('redaction-claimed@test.com', 10);

        const claimRes = await request(app)
            .post(`/api/posts/${leadId}/claim`)
            .set('Authorization', `Bearer ${token}`);

        expect(claimRes.status).toBe(200);

        const detailRes = await request(app)
            .get(`/api/posts/${leadId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(detailRes.status).toBe(200);
        expect(detailRes.body.data.is_claimed).toBe(true);
        expect(detailRes.body.data.email).toBe('lead@example.com');
        expect(detailRes.body.data.contact_info?.phone_numbers?.[0]?.number).toBe('+1-555-111-2222');
        expect(detailRes.body.data.url).toBe('https://linkedin.com/posts/redaction-lead-1');

        const listRes = await request(app)
            .get('/api/posts')
            .set('Authorization', `Bearer ${token}`);

        expect(listRes.status).toBe(200);
        const listed = listRes.body.data.find((p: any) => p._id.toString() === leadId);
        expect(listed).toBeTruthy();
        expect(listed.is_claimed).toBe(true);
        expect(listed.email).toBe('lead@example.com');
    });
});
