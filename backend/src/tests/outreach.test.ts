import request from 'supertest';
import express from 'express';
import * as dbHandler from './setup';
import authRoutes from '../routes/auth.routes';
import postRoutes from '../routes/post.routes';
import outreachRoutes from '../routes/outreach.routes';
import errorHandler from '../middleware/error';
import User from '../models/user.model';
import Role from '../models/role.model';
import RoleAssignment from '../models/role-assignment.model';
import LeadPost from '../models/lead-post.model';
import config from '../config';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/outreach', outreachRoutes);
app.use(errorHandler);

beforeAll(async () => await dbHandler.connect());
afterAll(async () => await dbHandler.close());
afterEach(async () => await dbHandler.clear());

async function setupUser(email: string, tokens = 20) {
    const user = await User.create({
        name: 'Outreach User',
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

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });

    return { token: loginRes.body.data.access_token, user };
}

describe('Outreach Draft API', () => {
    it('saves and loads a per-claim outreach draft', async () => {
        const { token } = await setupUser('outreach@test.com');

        const lead = await LeadPost.create({
            post_id: 'outreach-lead-1',
            url: 'https://test.com/outreach1',
            content: 'Looking for a partner to build outreach tooling',
            platform: 'linkedin',
            keyword: 'outreach',
            status: 'relevant',
            review_status: 'approved',
            intelligence: 'Good fit for cold email product.',
        });

        const claimRes = await request(app)
            .post(`/api/posts/${lead._id}/claim`)
            .set('Authorization', `Bearer ${token}`);

        expect(claimRes.status).toBe(200);
        const claimId = claimRes.body.claim?._id || claimRes.body.data?.claim?._id;
        expect(claimId).toBeTruthy();

        const saveRes = await request(app)
            .put(`/api/outreach/${claimId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                subject: 'Quick idea from your post',
                body: 'Hi — loved your note about outreach tooling. Happy to share how we approach this.',
            });

        expect(saveRes.status).toBe(200);
        expect(saveRes.body.data.subject).toBe('Quick idea from your post');
        expect(saveRes.body.data.body).toContain('outreach tooling');

        const getRes = await request(app)
            .get(`/api/outreach/${claimId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(getRes.status).toBe(200);
        expect(getRes.body.data.subject).toBe('Quick idea from your post');
        expect(getRes.body.data.body).toContain('outreach tooling');

        const claimedRes = await request(app)
            .get('/api/posts/claimed')
            .set('Authorization', `Bearer ${token}`);

        expect(claimedRes.status).toBe(200);
        const claim = (claimedRes.body.data || []).find((c: any) => c._id === claimId);
        expect(claim?.outreach_subject).toBe('Quick idea from your post');
        expect(claim?.outreach_body).toContain('outreach tooling');
    });

    it('rejects generate when OpenRouter is not configured', async () => {
        const { token } = await setupUser('outreach-gen@test.com');
        const prevKey = config.openRouter.apiKey;
        config.openRouter.apiKey = '';

        try {
            const lead = await LeadPost.create({
                post_id: 'outreach-lead-2',
                url: 'https://test.com/outreach2',
                content: 'Need help with lead gen',
                platform: 'linkedin',
                keyword: 'leads',
                status: 'relevant',
                review_status: 'approved',
                intelligence: 'Qualified.',
            });

            const claimRes = await request(app)
                .post(`/api/posts/${lead._id}/claim`)
                .set('Authorization', `Bearer ${token}`);

            const claimId = claimRes.body.claim?._id || claimRes.body.data?.claim?._id;

            const genRes = await request(app)
                .post('/api/outreach/generate')
                .set('Authorization', `Bearer ${token}`)
                .send({ claim_id: claimId });

            expect(genRes.status).toBe(503);
        } finally {
            config.openRouter.apiKey = prevKey;
        }
    });
});
