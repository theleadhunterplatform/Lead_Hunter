import dotenv from 'dotenv';
import { configureDatabaseEnv, resolveDatabaseMode } from './database-env';

dotenv.config();
configureDatabaseEnv();

const dbMode = resolveDatabaseMode();

function resolveRedisUrl(): string {
    const explicit = process.env.REDIS_URL?.trim();
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    const useCloudRedis = process.env.USE_CLOUD_REDIS === 'true';

    if (isDev && !useCloudRedis) {
        if (explicit?.includes('upstash.io')) {
            console.warn(
                '⚠️  Dev: REDIS_URL points to Upstash — using local Redis (redis://localhost:6379) instead.',
                'Set USE_CLOUD_REDIS=true to keep Upstash in development.'
            );
        }
        return 'redis://127.0.0.1:6379';
    }

    return explicit || 'redis://127.0.0.1:6379';
}

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
        /** Project Settings → API → JWT Secret (HS256). Required for phone auth exchange. */
        jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
    },
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || '',
        keySecret: process.env.RAZORPAY_KEY_SECRET || '',
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    },
    apify: {
        token: process.env.APIFY_API_TOKEN || '',
        linkedinActor: 'harvestapi/linkedin-post-search',
        linkedinProfileCommentsActor: process.env.APIFY_LINKEDIN_PROFILE_COMMENTS_ACTOR || 'harvestapi/linkedin-profile-comments',
        linkedinProfileActor: process.env.APIFY_LINKEDIN_PROFILE_ACTOR || 'dev_fusion/linkedin-profile-scraper',
        twitterProfileActor: process.env.APIFY_TWITTER_PROFILE_ACTOR || 'apidojo/twitter-user-scraper',
        monthlyCommentLimit: parseInt(process.env.APIFY_MONTHLY_COMMENT_LIMIT || '2500', 10),
    },
    targetScraper: {
        maxItems: parseInt(process.env.TARGET_SCRAPE_MAX_ITEMS || '20', 10),
        postedLimit: process.env.TARGET_SCRAPE_POSTED_LIMIT || '24h',
        /** Skip Apify call if this target was scraped within N hours (saves tokens). */
        minHoursBetweenScrapes: parseInt(process.env.TARGET_SCRAPE_MIN_HOURS || '6', 10),
    },
    cron: {
        interval: process.env.CRON_INTERVAL || '*/30 * * * *'
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'access_secret',
        accessExpire: process.env.JWT_ACCESS_EXPIRE || '15m',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        refreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d'
    },
    openRouter: {
        apiKey: process.env.OPEN_ROUTER_API || '',
        intelModel: process.env.OPEN_ROUTER_INTEL_MODEL || 'google/gemini-2.5-flash',
        intelMaxTokens: parseInt(process.env.OPEN_ROUTER_INTEL_MAX_TOKENS || '2048', 10),
    },
    redis: {
        url: resolveRedisUrl(),
        useCloud: process.env.USE_CLOUD_REDIS === 'true',
    },
    aiService: {
        url: (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, ''),
    },
    contactCompass: {
        monthlyLookupLimit: parseInt(process.env.CONTACT_COMPASS_MONTHLY_LOOKUP_LIMIT || '500', 10),
    },
    hunter: {
        apiKey: process.env.HUNTER_API_KEY || '',
    },
    apollo: {
        apiKey: process.env.APOLLO_API_KEY || '',
    },
    contactOut: {
        apiToken: process.env.CONTACTOUT_API_TOKEN || '',
    },
    googlePlaces: {
        apiKey: process.env.GOOGLE_PLACES_API_KEY || '',
    },
    googleOAuth: {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
    },
    email: {
        from: process.env.EMAIL_FROM || 'Lead Hunter <noreply@leadhunter.app>',
        resendApiKey: process.env.RESEND_API_KEY || '',
        smtp: {
            host: process.env.SMTP_HOST || '',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
        },
    },
    security: {
        extensionIngestApiKey: process.env.EXTENSION_INGEST_API_KEY || '',
        settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY || '',
        allowOpenRegistration: process.env.ALLOW_OPEN_REGISTRATION !== 'false',
        requireSignupApproval: process.env.REQUIRE_SIGNUP_APPROVAL !== 'false',
        platformOwnerEmails: (process.env.PLATFORM_OWNER_EMAILS || '')
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean),
    },
};

if (dbMode === 'supabase' && !process.env.DATABASE_URL && config.env === 'production') {
    console.warn('WARNING: DATABASE_URL is not set for Supabase in production!');
}

export default config;
