import dotenv from 'dotenv';
import { configureDatabaseEnv, resolveDatabaseMode } from './database-env';

dotenv.config();
configureDatabaseEnv();

const dbMode = resolveDatabaseMode();

const config = {
    env: process.env.NODE_ENV || 'development',
    appEnv: process.env.ENV || 'development',
    port: parseInt(process.env.PORT || '5001', 10),
    database: {
        mode: dbMode,
        provider: dbMode === 'local' ? 'sqlite' : 'postgresql',
        url: process.env.DATABASE_URL || '',
        directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
    },
    supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    apify: {
        token: process.env.APIFY_API_TOKEN || '',
        linkedinActor: 'harvestapi/linkedin-post-search',
        linkedinProfileCommentsActor: process.env.APIFY_LINKEDIN_PROFILE_COMMENTS_ACTOR || 'harvestapi/linkedin-profile-comments',
    },
    targetScraper: {
        maxItems: parseInt(process.env.TARGET_SCRAPE_MAX_ITEMS || '20', 10),
        postedLimit: process.env.TARGET_SCRAPE_POSTED_LIMIT || '24h',
    },
    cron: {
        interval: process.env.CRON_INTERVAL || '0 * * * *'
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'access_secret',
        accessExpire: process.env.JWT_ACCESS_EXPIRE || '15m',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        refreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d'
    },
    openRouter: {
        apiKey: process.env.OPEN_ROUTER_API || ''
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    aiService: {
        url: process.env.AI_SERVICE_URL || 'http://localhost:8000'
    }
};

if (dbMode === 'supabase' && !process.env.DATABASE_URL && config.env === 'production') {
    console.warn('WARNING: DATABASE_URL is not set for Supabase in production!');
}

export default config;
