import path from 'path';
import config from './config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db';
import { initCron } from './cron/leadScraper';
import { initKeepAliveCron } from './cron/keepAlive';
import { initTokenResetCron } from './cron/tokenReset';
import { seedRBAC } from './utils/seed-rbac.utils';
import authRoutes from './routes/auth.routes';
import keywordRoutes from './routes/keyword.routes';
import postRoutes from './routes/post.routes';
import apifyKeyRoutes from './routes/apify-key.routes';
import rbacRoutes from './routes/rbac.routes';
import aiRoutes from './routes/ai.routes';
import scraperRoutes from './routes/scraper.routes';
import settingRoutes from './routes/setting.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import crmRoutes from './routes/crm.routes';
import targetRoutes from './routes/target.routes';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';
import googleSheetsRoutes from './routes/google-sheets.routes';
import planRoutes from './routes/plan.routes';
import outreachRoutes from './routes/outreach.routes';
import paymentRoutes from './routes/payment.routes';
import onboardingRoutes from './routes/onboarding.routes';
import errorHandler from './middleware/error';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { initWorkers } from './workers';
import rateLimit from 'express-rate-limit';
import { verifyRedisConnection } from './utils/redis-health.utils';
import { validateProductionConfig } from './utils/startup-validation.utils';

const app = express();
app.disable('x-powered-by');

// Trust proxy for production environments (required for express-rate-limit)
app.set('trust proxy', 1);

const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || config.env === 'development') {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked for origin: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-org-id'],
}));

app.use(express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
    },
}));
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.env === 'production' ? 1200 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' || config.env !== 'production',
    message: { success: false, message: 'Too many requests, please try again later.' },
});

app.use(limiter);

// Static Folders
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', (req: Request, res: Response, next) => {
    const ext = path.extname(req.path).toLowerCase();
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp']);
    if (!allowed.has(ext)) {
        return res.status(403).json({ success: false, message: 'File type is not accessible' });
    }
    return next();
});
app.use('/uploads', express.static(uploadsPath, {
    fallthrough: false,
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, max-age=86400');
    },
}));

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log('✔ Created uploads directory');
}

// Swagger UI (dev only unless explicitly enabled)
if (config.env !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Health Check
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Basic Routes
app.use('/api/auth', authRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/leads', postRoutes); // alias – frontend may call /api/leads instead of /api/posts
app.use('/api/apify-keys', apifyKeyRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/scrapers', scraperRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/google-sheets', googleSheetsRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/onboarding', onboardingRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'API Route not found' });
});

// Error Handler (Must be last)
app.use(errorHandler);



// Initialize Database and Cron
const startServer = async () => {
    const PORT = config.port;

    validateProductionConfig();

    // Render requires binding to 0.0.0.0 and PORT from the environment
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });

    await connectDB();
    await seedRBAC(); // Seed the Scoped RBAC System on first run

    const redisReady = await verifyRedisConnection();
    if (redisReady) {
        initWorkers();
    } else {
        // Retry workers every 30 seconds until Redis is available
        console.warn('⚠ Redis not ready — retrying worker init every 30s...');
        const retryInterval = setInterval(async () => {
            const ready = await verifyRedisConnection();
            if (ready) {
                clearInterval(retryInterval);
                initWorkers();
                console.log('✔ Redis connected — workers initialized.');
            }
        }, 30000);
    }
    
    if (config.appEnv === 'production' || process.env.ENABLE_CRON_DEV === 'true') {
        await initCron();
        initKeepAliveCron();
        initTokenResetCron();
        console.log(`✔ Cron jobs initialized (${config.appEnv === 'production' ? 'Production' : 'Dev-Forced'}).`);
    } else {
        console.log('ℹ Non-production environment: Scheduled cron jobs skipped. Use /api/scrapers to trigger manually.');
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
    console.error(`Unhandled Rejection: ${err?.message || err}`);
});

// Handle uncaught exceptions — exit on fatal errors so PM2 can restart cleanly
process.on('uncaughtException', (err: any) => {
    console.error(`CRITICAL UNCAUGHT EXCEPTION: ${err.message}`);
    if (err.message.includes('libpng') || err.message.includes('tesseract')) {
        console.warn('Recovering from Tesseract/Image processing failure. Process kept alive.');
    } else {
        console.error('Fatal error — exiting for clean restart by PM2.');
        process.exit(1);
    }
});

startServer();
