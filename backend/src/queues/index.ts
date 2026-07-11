import { Queue } from 'bullmq';
import { redisConnection } from './connection';

// 1. Scraper Queue - Handles Apify actor calls
export const scraperQueue = new Queue('scraper-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        // Keep completed scrape jobs ~25h so daily jobId dedupe actually works.
        // removeOnComplete: true was re-queuing the same targets every 30 min.
        removeOnComplete: { age: 60 * 60 * 25 },
        removeOnFail: false,
    }
});

// 2. Intelligence Queue - Handles OpenRouter AI report generation
export const intelligenceQueue = new Queue('intelligence-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});

// 3. OCR Queue - Handles lead qualification
export const ocrQueue = new Queue('ocr-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 2,
        removeOnComplete: true,
        removeOnFail: false,
    }
});

// 4. AI Train Queue - Auto-retrains local model from labeled leads
export const aiTrainQueue = new Queue('ai-train-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 2,
        removeOnComplete: true,
        removeOnFail: false,
    }
});

// 5. Enrichment Queue - Finds email/phone for qualified leads
export const enrichmentQueue = new Queue('enrichment-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});

console.log('✔ BullMQ Queues Initialized');
