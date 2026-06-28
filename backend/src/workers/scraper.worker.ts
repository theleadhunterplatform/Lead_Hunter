import { Worker, Job } from 'bullmq';
import { createWorkerOptions } from '../queues/worker-options';
import { ScraperService } from '../services/scraper.service';
import { TargetScraperService } from '../services/target-scraper.service';

export const scraperWorker = new Worker(
    'scraper-queue',
    async (job: Job) => {
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
    createWorkerOptions({ concurrency: 5 })
);

scraperWorker.on('failed', (job, err) => {
    const platform = job?.data?.platform || (job?.data?.targetId ? 'linkedin-watchlist' : 'unknown');
    const keyword = job?.data?.keywordText || job?.data?.keywordId || job?.data?.targetId || '?';
    console.error(
        `🚨 [KeywordScrape] Job ${job?.id} failed after retries — platform=${platform} target=${keyword}:`,
        err.message
    );
});
