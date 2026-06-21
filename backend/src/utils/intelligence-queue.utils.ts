import { intelligenceQueue } from '../queues';

export async function enqueueLeadIntelligence(postId: string, options?: { force?: boolean }) {
    const jobId = options?.force ? `intel-${postId}-${Date.now()}` : `intel-${postId}`;

    await intelligenceQueue.add(
        jobId,
        { postId },
        {
            jobId,
            removeOnComplete: true,
        }
    );
}
