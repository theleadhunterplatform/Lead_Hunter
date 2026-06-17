import { Worker, Job } from 'bullmq';
import { createWorkerOptions } from '../queues/worker-options';
import LeadPost from '../models/lead-post.model';
import { generateLeadIntelligence } from '../services/intelligence.service';

export const intelligenceWorker = new Worker(
    'intelligence-queue',
    async (job: Job) => {
        const { postId } = job.data;
        console.log(`👷 [IntelligenceWorker] Generating report for post: ${postId}`);
        
        const post = await LeadPost.findById(postId);
        if (!post) {
            console.warn(`[IntelligenceWorker] Post ${postId} not found. Skipping.`);
            return;
        }

        try {
            await generateLeadIntelligence(post);
            console.log(`✅ [IntelligenceWorker] Report generated for post: ${postId}`);
        } catch (error: any) {
            console.error(`❌ [IntelligenceWorker] Failed for post ${postId}:`, error.message);
            throw error;
        }
    },
    createWorkerOptions({ concurrency: 3 })
);
