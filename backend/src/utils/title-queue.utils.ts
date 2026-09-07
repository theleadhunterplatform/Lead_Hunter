import { titleQueue } from '../queues';

export async function enqueueLeadTitling(postId: string): Promise<void> {
    const jobId = `title-${postId}`;

    // Skip if already queued
    const existing = await titleQueue.getJob(jobId);
    if (existing) {
        const state = await existing.getState();
        if (state === 'waiting' || state === 'active' || state === 'delayed') return;
        await existing.remove().catch(() => undefined);
    }

    await titleQueue.add(jobId, { postId }, { jobId, removeOnComplete: true });
}
