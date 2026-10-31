import cron from 'node-cron';
import { runScraperProducerJob } from '../services/scraper-producer.service';
import { isAutoScrapeEnabled } from '../utils/automation-settings.utils';
import { checkAutomationQuietHours } from '../utils/quiet-hours.utils';
import { scraperQueue } from '../queues';

const TIMEZONE = 'Asia/Kolkata';

/**
 * Initializes scraping automation with a hard stop at 7:00 PM IST and hard start at 10:00 AM IST.
 * 
 * 1. Runs every 30 min ONLY during the active window (10:00 AM - 6:30 PM IST).
 * 2. At 7:00 PM IST: Physically pauses BullMQ scraper queue and drains stragglers.
 * 3. At 10:00 AM IST: Resumes BullMQ scraper queue and triggers the morning scrape.
 * 4. On startup: Checks current IST time and sets the queue state immediately.
 */
export const initCron = async () => {
    // 1. Synchronize initial queue state on server startup
    try {
        const quietHours = await checkAutomationQuietHours();
        if (quietHours.isSuspended) {
            await scraperQueue.pause();
            await scraperQueue.drain();
            console.log('🌙 [AUTOMATION SUSPENDED] Server initialized during quiet hours (7:00 PM - 10:00 AM IST). Queue is PAUSED & DRAINED.');
        } else {
            await scraperQueue.resume();
            console.log('☀️ [AUTOMATION ACTIVE] Server initialized during operational window (10:00 AM - 7:00 PM IST). Queue is ACTIVE.');
        }
    } catch (err: any) {
        console.warn('⚠️ [CRON] Failed to check initial quiet hours status on startup:', err.message);
    }

    // 2. Hard Stop Trigger: 7:00 PM IST daily
    cron.schedule('0 19 * * *', async () => {
        console.log('🌙 [CRON 7:00 PM IST] Hard stopping automation — pausing BullMQ scraper queue');
        try {
            await scraperQueue.pause();
            await scraperQueue.drain();
        } catch (err: any) {
            console.error('❌ [CRON 7:00 PM IST] Failed to pause queue:', err.message);
        }
    }, { timezone: TIMEZONE });

    // 3. Hard Start Trigger: 10:00 AM IST daily
    cron.schedule('0 10 * * *', async () => {
        console.log('☀️ [CRON 10:00 AM IST] Resuming automation — unpausing BullMQ scraper queue');
        try {
            await scraperQueue.resume();
            const enabled = await isAutoScrapeEnabled();
            if (enabled) {
                console.log('🚀 [CRON 10:00 AM IST] Triggering morning auto-scrape producer run');
                await runScraperProducerJob();
            }
        } catch (err: any) {
            console.error('❌ [CRON 10:00 AM IST] Failed to resume automation:', err.message);
        }
    }, { timezone: TIMEZONE });

    // 4. Operational Interval: Every 30 min between 10:00 AM and 6:30 PM IST
    // Hours: 10, 11, 12, 13, 14, 15, 16, 17, 18 (e.g. 10:00, 10:30 ... 18:30)
    // Never ticks between 7:00 PM and 10:00 AM.
    cron.schedule('*/30 10-18 * * *', async () => {
        const quietHours = await checkAutomationQuietHours();
        if (quietHours.isSuspended) {
            console.log(quietHours.message);
            return;
        }

        const enabled = await isAutoScrapeEnabled();
        if (!enabled) return;

        console.log('--- [CRON] In operational window (10 AM - 7 PM IST) — triggering auto-scrape ---');
        try {
            await runScraperProducerJob();
        } catch (error: any) {
            console.error('❌ [CRON] Scraper Producer Job Failed:', error.message);
        }
    }, { timezone: TIMEZONE });

    console.log(`✔ Scraper Automation Hard Scheduled: 10:00 AM to 7:00 PM ${TIMEZONE} (Queue auto-pauses at 7 PM, resumes at 10 AM)`);
};
