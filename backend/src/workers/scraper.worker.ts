import { Worker, Job } from 'bullmq';
import { createWorkerOptions } from '../queues/worker-options';
import { ScraperService } from '../services/scraper.service';
import { TargetScraperService } from '../services/target-scraper.service';
import { logScrapeRun } from '../utils/scrape-run-log.utils';

export const scraperWorker = new Worker(
    'scraper-queue',
    async (job: Job) => {
        const { type, keywordId, platform, targetId, keywordText, targetName } = job.data;
        const startedAt = new Date();

        try {
            if (type === 'target' || targetId) {
                console.log(`👷 [WatchlistScrape] Job ${job.id}: LinkedIn target ${targetId}`);
                const result = await TargetScraperService.scrapeTargetProfile(targetId);
                const items = result.saved + result.skipped;

                await logScrapeRun({
                    job_name: 'watchlist-scrape',
                    status: 'completed',
                    items_scraped: items,
                    total_processed: items,
                    new_leads: result.saved,
                    duplicate_count: result.skipped,
                    started_at: startedAt,
                    details: {
                        platform: 'linkedin-watchlist',
                        targetId,
                        targetName: targetName || targetId,
                    },
                });
            } else {
                const label = keywordText ? `"${keywordText}"` : keywordId;
                console.log(
                    `👷 [KeywordScrape] Job ${job.id}: platform=${platform} keyword=${label} (${keywordId})`
                );
                const result = await ScraperService.scrapeKeyword(keywordId, platform);

                await logScrapeRun({
                    job_name: 'keyword-scrape',
                    status: 'completed',
                    items_scraped: result.items_scraped,
                    total_processed: result.items_scraped,
                    new_leads: result.new_leads,
                    duplicate_count: result.duplicate_count,
                    started_at: startedAt,
                    details: {
                        platform,
                        keywordId,
                        keywordText: keywordText || null,
                    },
                });
            }
            console.log(`✅ [ScraperWorker] Job ${job.id} completed (platform=${platform || 'watchlist'}).`);
        } catch (error: any) {
            const isWatchlist = type === 'target' || targetId;
            await logScrapeRun({
                job_name: isWatchlist ? 'watchlist-scrape' : 'keyword-scrape',
                status: 'failed',
                items_scraped: 0,
                total_processed: 0,
                new_leads: 0,
                duplicate_count: 0,
                error: error.message,
                started_at: startedAt,
                details: isWatchlist
                    ? { platform: 'linkedin-watchlist', targetId, targetName: targetName || targetId }
                    : { platform, keywordId, keywordText: keywordText || null },
            });
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
