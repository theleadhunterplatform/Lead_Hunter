import path from 'path';
import config from './config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import connectDB from './config/db';
import { initCron } from './cron/leadScraper';
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
import errorHandler from './middleware/error';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { initWorkers } from './workers';
import rateLimit from 'express-rate-limit';
import { verifyRedisConnection } from './utils/redis-health.utils';

const app = express();

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

app.use(express.json());
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(morgan('dev'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.env === 'production' ? 100 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' || config.env !== 'production',
    message: { success: false, message: 'Too many requests, please try again later.' },
});

app.use(limiter);

// Static Folders
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log('✔ Created uploads directory');
}

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Basic Routes
app.use('/api/auth', authRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/apify-keys', apifyKeyRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/scrapers', scraperRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'API Route not found' });
});

// Error Handler (Must be last)
app.use(errorHandler);



// Initialize Database and Cron
const startServer = async () => {
    const PORT = config.port;

    // Render requires binding to 0.0.0.0 and PORT from the environment
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });

    await connectDB();
    await seedRBAC(); // Seed the Scoped RBAC System on first run

    const redisReady = await verifyRedisConnection();
    if (redisReady) {
        await initWorkers(); // Start background workers
    }
    
    if (config.appEnv === 'production' || process.env.ENABLE_CRON_DEV === 'true') {
        await initCron();
        console.log(`✔ Cron jobs initialized (${config.appEnv === 'production' ? 'Production' : 'Dev-Forced'}).`);
    } else {
        console.log('ℹ Non-production environment: Scheduled cron jobs skipped. Use /api/scrapers to trigger manually.');
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    // Optional: close server & exit process if it's a fatal DB error
    // server.close(() => process.exit(1));
});

// Handle uncaught exceptions (like Tesseract worker crashes)
process.on('uncaughtException', (err: any) => {
    console.error(`CRITICAL UNCAUGHT EXCEPTION: ${err.message}`);
    if (err.message.includes('libpng') || err.message.includes('tesseract')) {
        console.warn('Recovering from Tesseract/Image processing failure. Process kept alive.');
    } else {
        // For other unknown critical errors, we might still want to exit
        // process.exit(1);
    }
});

startServer();
