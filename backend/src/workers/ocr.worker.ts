import { Worker, Job } from 'bullmq';
import { redisConnection } from '../queues/connection';
import LeadPost from '../models/lead-post.model';
import { classifyText } from '../services/ocr.service';
import { intelligenceQueue } from '../queues';

export const ocrWorker = new Worker(
    'ocr-queue',
    async (job: Job) => {
        const { postId } = job.data;
        console.log(`👷 [OCRWorker] Classifying post: ${postId}`);
        
        const post = await LeadPost.findById(postId);
        if (!post) return;

        try {
            // We use the content for classification
            const aiResult = await classifyText(post.content);
            if (aiResult) {
                post.status = aiResult.label;
                post.ai_score = Math.round(aiResult.confidence * 100);
                await post.save();
                console.log(`[OCRWorker] Post ${postId} classified as ${aiResult.label}`);

                if (aiResult.label === 'relevant') {
                    // Enqueue intelligence generation
                    await intelligenceQueue.add(`intel-${postId}`, { postId });
                }
            }
        } catch (error: any) {
            console.error(`❌ [OCRWorker] Classification failed for post ${postId}:`, error.message);
            throw error;
        }
    },
    {
        connection: redisConnection,
        concurrency: 10, // Higher concurrency for classification (it's fast)
    }
);
