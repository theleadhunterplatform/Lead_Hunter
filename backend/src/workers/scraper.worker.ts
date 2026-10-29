import { Worker, Job } from 'bullmq';
import { createWorkerOptions } from '../queues/worker-options';
import { ScraperService } from '../services/scraper.service';
import { TargetScraperService } from '../services/target-scraper.service';
import { checkAutomationQuietHours } from '../utils/quiet-hours.utils';

export const scraperWorker = new Worker(
    'scraper-queue',
    async (job: Job) => {
        // Enforce quiet hours at worker level for non-manual jobs
        const isManual = job.name?.startsWith('manual-scrape-') || job.data?.force === true || job.data?.isManual === true;
        if (!isManual) {
            const quietHours = await checkAutomationQuietHours();
            if (quietHours.isSuspended) {
                console.log(`🌙 [ScraperWorker] Quiet hours active — skipping auto-scrape job ${job.id} (${job.name})`);
                return;
            }
        }

        const { type, keywordId, platform, targetId, keywordText } = job.data;

        try {
            if (type === 'target' || targetId) {
                console.log(`👷 [WatchlistScrape] Job ${job.id}: LinkedIn target ${targetId}`);
                await TargetScraperService.scrapeTargetProfile(targetId);
            } else {
                const label = keywordText ? `"${keywordText}"` : keywordId;
                console.log(
                    `👷 [KeywordScrape] Job ${job.id}: platform=${platform} keyword=${label} (${keywordId})`
                );
                await ScraperService.scrapeKeyword(keywordId, platform);
            }
            console.log(`✅ [ScraperWorker] Job ${job.id} completed (platform=${platform || 'watchlist'}).`);
        } catch (error: any) {
            console.error(
                `❌ [KeywordScrape] Job ${job.id} failed — platform=${platform || 'watchlist'}:`,
                error.message
            );
            throw error;
        }
    },
    createWorkerOptions({ concurrency: 2 })
);

scraperWorker.on('failed', (job, err) => {
    const platform = job?.data?.platform || (job?.data?.targetId ? 'linkedin-watchlist' : 'unknown');
    const keyword = job?.data?.keywordText || job?.data?.keywordId || job?.data?.targetId || '?';
    console.error(
        `🚨 [KeywordScrape] Job ${job?.id} failed after retries — platform=${platform} target=${keyword}:`,
        err.message
    );
});
