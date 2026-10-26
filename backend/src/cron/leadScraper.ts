import cron from 'node-cron';
import { runScraperProducerJob } from '../services/scraper-producer.service';
import { isAutoScrapeEnabled } from '../utils/automation-settings.utils';
import { checkAutomationQuietHours } from '../utils/quiet-hours.utils';
import config from '../config';

/**
 * Initializes the producer cron job that enqueues scraping tasks into BullMQ.
 * Interval is controlled by CRON_INTERVAL env var (default: every 30 min).
 * Automatically suspends execution between 7:00 PM and 10:00 AM IST.
 */
export const initCron = async () => {
    const interval = config.cron.interval;

    cron.schedule(interval, async () => {
        const quietHours = await checkAutomationQuietHours();
        if (quietHours.isSuspended) {
            console.log(quietHours.message);
            return;
        }

        const enabled = await isAutoScrapeEnabled();
        if (!enabled) return;

        console.log('--- [CRON] Auto-scrape active & in operational window — triggering producer job ---');

        try {
            await runScraperProducerJob();
        } catch (error: any) {
            console.error('❌ [CRON] Scraper Producer Job Failed:', error.message);
        }
    });

    console.log(`✔ Scraper Cron Initialized: ${interval} (automatically suspends 7:00 PM - 10:00 AM IST)`);
};
