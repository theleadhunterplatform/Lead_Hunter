import { Job, Worker } from 'bullmq';
import { createWorkerOptions } from '../queues/worker-options';
import { enrichLeadPost } from '../services/enrichment.service';

export const enrichmentWorker = new Worker(
    'enrichment-queue',
    async (job: Job) => {
        const { postId } = job.data;
        console.log(`👷 [EnrichmentWorker] Processing post: ${postId}`);

        try {
            await enrichLeadPost(postId);
            console.log(`✅ [EnrichmentWorker] Post ${postId} enriched.`);
        } catch (error: any) {
            console.error(`❌ [EnrichmentWorker] Failed for post ${postId}:`, error.message);
            throw error;
        }
    },
    createWorkerOptions({ concurrency: 5 })
);

enrichmentWorker.on('failed', (job, err) => {
    console.error(`🚨 [EnrichmentWorker] Job ${job?.id} failed:`, err.message);
});
