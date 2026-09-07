import { Worker, Job } from 'bullmq';
import { createWorkerOptions } from '../queues/worker-options';
import { applyLeadTitle } from '../services/titling.service';

export const titlingWorker = new Worker(
    'title-queue',
    async (job: Job) => {
        const { postId } = job.data;
        console.log(`🏷️  [TitlingWorker] Generating title for post: ${postId}`);
        try {
            await applyLeadTitle(postId);
            console.log(`✅ [TitlingWorker] Title saved for post: ${postId}`);
        } catch (error: any) {
            console.error(`❌ [TitlingWorker] Failed for post ${postId}:`, error.message);
            throw error;
        }
    },
    createWorkerOptions({ concurrency: 5 }),
);
