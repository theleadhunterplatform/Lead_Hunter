import request from 'supertest';
import express from 'express';
import * as dbHandler from './setup';
import authRoutes from '../routes/auth.routes';
import postRoutes from '../routes/post.routes';
import crmRoutes from '../routes/crm.routes';
import errorHandler from '../middleware/error';
import User from '../models/user.model';
import Role from '../models/role.model';
import RoleAssignment from '../models/role-assignment.model';
import Organization from '../models/organization.model';
import LeadPost from '../models/lead-post.model';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/crm', crmRoutes);
app.use(errorHandler);

beforeAll(async () => await dbHandler.connect());
afterAll(async () => await dbHandler.close());
afterEach(async () => await dbHandler.clear());

async function setupOrgAdmin(email: string) {
    const user: any = await User.create({
        name: 'Org Admin',
        email,
        password: 'password123',
    });

    const org = await Organization.create({
        name: 'CRM Corp',
        ownerId: user._id,
    });

    user.organization = org._id;
    await user.save();

    const role = await Role.findOne({ slug: 'org_admin' });
    await RoleAssignment.create({
        userId: user._id,
        roleId: role!._id,
        scope: { type: 'organization', organizationId: org._id },
        assignedBy: user._id
    });

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });

    return { token: loginRes.body.data.access_token, user, org };
}

describe('CRM Integration Tests', () => {
    it('should allow org admin to invite a team member', async () => {
        const { token, org } = await setupOrgAdmin('admin@crm.com');

        const res = await request(app)
            .post('/api/crm/team/invite')
            .set('Authorization', `Bearer ${token}`)
            .set('x-org-id', org._id.toString())
            .send({
                email: 'member@crm.com',
                name: 'Team Member',
                roleSlug: 'org_user'
            });

        expect(res.status).toBe(201);
        expect(res.body.data.email).toBe('member@crm.com');

        const member = await User.findOne({ email: 'member@crm.com' });
        expect(member?.organization?.toString()).toBe(org._id.toString());
    });

    it('should update CRM status for a claimed lead', async () => {
        const { token, org } = await setupOrgAdmin('admin2@crm.com');
        
        const lead = await LeadPost.create({
            post_id: 'crm-lead-1',
            url: 'https://test.com/crm1',
            content: 'Need CRM help',
            platform: 'linkedin',
            keyword: 'crm',
            status: 'relevant',
            intelligence: 'Qualified CRM lead with high budget.'
        });

        // Claim first
        const claimRes = await request(app)
            .post(`/api/posts/${lead._id}/claim`)
            .set('Authorization', `Bearer ${token}`)
            .set('x-org-id', org._id.toString());
        
        const claimId = claimRes.body.claim._id;

        // Update status
        const res = await request(app)
            .put(`/api/crm/claims/${claimId}`)
            .set('Authorization', `Bearer ${token}`)
            .set('x-org-id', org._id.toString())
            .send({ status: 'replied', notes: 'Great conversation today' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('replied');
        expect(res.body.data.notes).toBe('Great conversation today');
    });

    it('should send email and mark lead as contacted', async () => {
        const { token, org } = await setupOrgAdmin('admin3@crm.com');
        
        const lead = await LeadPost.create({
            post_id: 'crm-lead-2',
            url: 'https://test.com/crm2',
            content: 'Need email help',
            platform: 'linkedin',
            keyword: 'email',
            status: 'relevant',
            email: 'lead@target.com', // Email needed for sending
            intelligence: 'Interested in email automation services.'
        });

        await request(app)
            .post(`/api/posts/${lead._id}/claim`)
            .set('Authorization', `Bearer ${token}`)
            .set('x-org-id', org._id.toString());

        const res = await request(app)
            .post('/api/crm/send-email')
            .set('Authorization', `Bearer ${token}`)
            .set('x-org-id', org._id.toString())
            .send({
                leadId: lead._id,
                subject: 'Hello from CRM',
                body: 'We can help you.'
            });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('contacted');
        expect(res.body.data.last_contacted).toBeTruthy();
    });
});
