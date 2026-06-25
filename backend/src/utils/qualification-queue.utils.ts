import { ocrQueue } from '../queues';

const jobIdFor = (postId: string) => `qualify-${postId}`;

/** Drop a stale qualification job so bulk re-analyse can always enqueue a fresh run. */
async function removeStaleQualificationJob(postId: string) {
    const jobId = jobIdFor(postId);
    const existing = await ocrQueue.getJob(jobId);
    if (!existing) return;

    const state = await existing.getState();
    if (state === 'active') return;

    try {
        await existing.remove();
    } catch {
        // Best-effort — a new timestamped job is added when force=true.
    }
}

export async function enqueueLeadQualification(postId: string, options?: { force?: boolean }) {
    if (options?.force) {
        await removeStaleQualificationJob(postId);
        await ocrQueue.add(
            jobIdFor(postId),
            { postId },
            {
                jobId: `${jobIdFor(postId)}-${Date.now()}`,
                removeOnComplete: true,
            }
        );
        return;
    }

    await ocrQueue.add(
        jobIdFor(postId),
        { postId },
        {
            jobId: jobIdFor(postId),
            removeOnComplete: true,
        }
    );
}
