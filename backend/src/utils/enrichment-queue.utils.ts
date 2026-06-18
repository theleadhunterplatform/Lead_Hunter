import { enrichmentQueue } from '../queues';
import { shouldEnrichLead } from '../services/enrichment.service';

export async function enqueueContactEnrichment(
    postId: string,
    lead?: { status?: string; platform?: string },
    options?: { force?: boolean }
) {
    if (lead && !shouldEnrichLead(lead)) return false;

    const jobId = options?.force ? `enrich-${postId}-${Date.now()}` : `enrich-${postId}`;

    await enrichmentQueue.add(
        jobId,
        { postId, force: options?.force ?? false },
        {
            jobId,
            removeOnComplete: true,
        }
    );

    return true;
}
