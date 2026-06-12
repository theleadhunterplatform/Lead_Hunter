import request from 'supertest';
import express from 'express';
import * as dbHandler from './setup';
import authRoutes from '../routes/auth.routes';
import leaderboardRoutes from '../routes/leaderboard.routes';
import errorHandler from '../middleware/error';
import User from '../models/user.model';
import Role from '../models/role.model';
import RoleAssignment from '../models/role-assignment.model';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use(errorHandler);

beforeAll(async () => await dbHandler.connect());
afterAll(async () => await dbHandler.close());
afterEach(async () => await dbHandler.clear());

async function setupUser(email: string, points: number = 0) {
    const user = await User.create({
        name: 'Test User',
        email,
        password: 'password123',
        points
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

describe('Leaderboard Integration Tests', () => {
    it('should retrieve users sorted by points', async () => {
        await setupUser('low@test.com', 50);
        await setupUser('high@test.com', 200);
        await setupUser('mid@test.com', 100);

        const res = await request(app).get('/api/leaderboard');

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(3);
        expect(res.body.data[0].email).toBe('high@test.com');
        expect(res.body.data[1].email).toBe('mid@test.com');
        expect(res.body.data[2].email).toBe('low@test.com');
    });

    it('should allow user to earn points', async () => {
        const { token } = await setupUser('earner@test.com', 10);

        const res = await request(app)
            .post('/api/leaderboard/earn')
            .set('Authorization', `Bearer ${token}`)
            .send({ points: 30, reason: 'Test Activity' });

        expect(res.status).toBe(200);
        expect(res.body.data.current_points).toBe(40);
    });

    it('should convert 100 points into 1 token', async () => {
        const { token, user } = await setupUser('converter@test.com', 90);
        const initialTokens = (user as any).tokens;

        const res = await request(app)
            .post('/api/leaderboard/earn')
            .set('Authorization', `Bearer ${token}`)
            .send({ points: 20 });

        expect(res.status).toBe(200);
        // 90 + 20 = 110. 100 points -> 1 token. Remaining points: 10.
        expect(res.body.data.current_points).toBe(10);
        expect(res.body.data.current_tokens).toBe(initialTokens + 1);
    });
});
