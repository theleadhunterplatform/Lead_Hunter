import cron from 'node-cron';
import { runScraperProducerJob } from '../services/scraper-producer.service';
import { isAutoScrapeEnabled } from '../utils/automation-settings.utils';
import config from '../config';

/**
 * Initializes the producer cron job that enqueues scraping tasks into BullMQ.
 * Interval is controlled by CRON_INTERVAL env var (default: every 30 min).
 */
export const initCron = async () => {
    const interval = config.cron.interval;

    cron.schedule(interval, async () => {
        const enabled = await isAutoScrapeEnabled();
        if (!enabled) return;

        console.log('--- [CRON] Auto-scrape enabled — triggering producer job ---');

        try {
            await runScraperProducerJob();
        } catch (error: any) {
            console.error('❌ [CRON] Scraper Producer Job Failed:', error.message);
        }
    });

    console.log(`✔ Scraper Cron Initialized: ${interval} (active when auto-scrape is ON)`);
};
