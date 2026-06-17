import { Worker, Job } from 'bullmq';
import { createWorkerOptions } from '../queues/worker-options';
import { qualifyLeadPost } from '../services/qualification.service';

export const ocrWorker = new Worker(
    'ocr-queue',
    async (job: Job) => {
        const { postId } = job.data;
        console.log(`👷 [QualificationWorker] Processing post: ${postId}`);

        try {
            await qualifyLeadPost(postId);
            console.log(`✅ [QualificationWorker] Post ${postId} qualified.`);
        } catch (error: any) {
            console.error(`❌ [QualificationWorker] Failed for post ${postId}:`, error.message);
            throw error;
        }
    },
    createWorkerOptions({ concurrency: 10 })
);

ocrWorker.on('failed', (job, err) => {
    console.error(`🚨 [QualificationWorker] Job ${job?.id} failed:`, err.message);
});
