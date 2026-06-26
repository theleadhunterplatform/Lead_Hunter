import cron from 'node-cron';
import { runScraperProducerJob } from '../services/scraper-producer.service';
import { isAutoScrapeEnabled } from '../utils/automation-settings.utils';

const AUTO_SCRAPE_CRON = '*/30 * * * *';

/**
 * Initializes the producer cron job that enqueues scraping tasks into BullMQ.
 * Runs every 30 minutes when auto-scrape is enabled in platform settings.
 */
export const initCron = async () => {
    cron.schedule(AUTO_SCRAPE_CRON, async () => {
        const enabled = await isAutoScrapeEnabled();
        if (!enabled) {
            return;
        }

        console.log('--- [CRON] Auto-scrape enabled — triggering producer job ---');

        try {
            await runScraperProducerJob();
        } catch (error: any) {
            console.error('❌ [CRON] Scraper Producer Job Failed:', error.message);
        }
    });

    console.log(`✔ Scraper Cron Initialized: every 30 min (active when auto-scrape is ON)`);
};
