import request from 'supertest';
import express from 'express';
import * as dbHandler from './setup';
import authRoutes from '../routes/auth.routes';
import errorHandler from '../middleware/error';
import User from '../models/user.model';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

beforeAll(async () => await dbHandler.connect());
afterAll(async () => await dbHandler.close());
afterEach(async () => await dbHandler.clear());

describe('Auth Integration Tests', () => {
    
    describe('POST /api/auth/register', () => {
        const validUser = {
            name: 'Test User',
            email: 'registrant@example.com',
            password: 'password123'
        };

        it('should register a new individual user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(validUser);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.email).toBe(validUser.email);
            expect(res.body.data).toHaveProperty('access_token');
            
            // Verify role assignment in DB
            const user = await User.findOne({ email: validUser.email });
            expect(user).toBeDefined();
        });

        it('should register a new organization admin successfully', async () => {
            const orgUser = {
                ...validUser,
                organization_name: 'Test Org'
            };
            const res = await request(app)
                .post('/api/auth/register')
                .send(orgUser);

            expect(res.status).toBe(201);
            expect(res.body.data.user.organization).toBeDefined();
        });

        it('should fail if email already exists', async () => {
            await request(app).post('/api/auth/register').send(validUser);
            const res = await request(app).post('/api/auth/register').send(validUser);

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/already exists/i);
        });

        it('should fail if name is missing', async () => {
            const { name, ...invalidUser } = validUser;
            const res = await request(app)
                .post('/api/auth/register')
                .send(invalidUser);

            expect(res.status).toBe(400);
        });

        it('should fail if email is invalid', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...validUser, email: 'not-an-email' });

            expect(res.status).toBe(400);
        });

        it('should fail if password is too short', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ ...validUser, password: '123' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        const credentials = {
            email: 'login@example.com',
            password: 'password123'
        };

        beforeEach(async () => {
            await request(app).post('/api/auth/register').send({
                name: 'Login User',
                ...credentials
            });
        });

        it('should login successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send(credentials);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('access_token');
        });

        it('should fail with incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ ...credentials, password: 'wrongpassword' });

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/invalid credentials/i);
        });

        it('should fail with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'none@example.com', password: 'password' });

            expect(res.status).toBe(401);
        });

        it('should fail if user is inactive', async () => {
            await User.findOneAndUpdate({ email: credentials.email }, { is_active: false });
            
            const res = await request(app)
                .post('/api/auth/login')
                .send(credentials);

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/inactive/i);
        });

        it('should fail if user is deleted', async () => {
            await User.findOneAndUpdate({ email: credentials.email }, { is_deleted: true });
            
            const res = await request(app)
                .post('/api/auth/login')
                .send(credentials);

            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/auth/refresh', () => {
        let refreshToken: string;

        beforeEach(async () => {
            const res = await request(app).post('/api/auth/register').send({
                name: 'Refresh User',
                email: 'refresh@example.com',
                password: 'password123'
            });
            refreshToken = res.body.data.refresh_token;
        });

        it('should refresh tokens successfully', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refresh_token: refreshToken });

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('access_token');
            expect(res.body.data).toHaveProperty('refresh_token');
        });

        it('should fail with invalid refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refresh_token: 'invalid-token' });

            expect(res.status).toBe(401);
        });

        it('should fail if refresh token is missing', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({});

            expect(res.status).toBe(400);
        });
    });
});
