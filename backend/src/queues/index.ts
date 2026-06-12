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
        removeOnComplete: true,
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

// 3. OCR Queue - Handles local AI service calls (OCR/Classification)
export const ocrQueue = new Queue('ocr-queue', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 2,
        removeOnComplete: true,
        removeOnFail: false,
    }
});

console.log('✔ BullMQ Queues Initialized');
