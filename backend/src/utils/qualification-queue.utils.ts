import { ocrQueue } from '../queues';

export async function enqueueLeadQualification(postId: string) {
    await ocrQueue.add(
        `qualify-${postId}`,
        { postId },
        {
            jobId: `qualify-${postId}`,
            removeOnComplete: true,
        }
    );
}
