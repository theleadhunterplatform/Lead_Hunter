import { Worker, Job } from 'bullmq';
import { createWorkerOptions } from '../queues/worker-options';
import { ScraperService } from '../services/scraper.service';
import { TargetScraperService } from '../services/target-scraper.service';

export const scraperWorker = new Worker(
    'scraper-queue',
    async (job: Job) => {
        const { type, keywordId, platform, targetId } = job.data;

        try {
            if (type === 'target' || targetId) {
                console.log(`👷 [ScraperWorker] Processing target job ${job.id}: ${targetId}`);
                await TargetScraperService.scrapeTargetProfile(targetId);
            } else {
                console.log(`👷 [ScraperWorker] Processing keyword job ${job.id}: ${platform} for keyword ${keywordId}`);
                await ScraperService.scrapeKeyword(keywordId, platform);
            }
            console.log(`✅ [ScraperWorker] Job ${job.id} completed successfully.`);
        } catch (error: any) {
            console.error(`❌ [ScraperWorker] Job ${job.id} failed:`, error.message);
            throw error;
        }
    },
    createWorkerOptions({ concurrency: 5 })
);

scraperWorker.on('failed', (job, err) => {
    console.error(`🚨 [ScraperWorker] Job ${job?.id} failed after retries:`, err.message);
});
