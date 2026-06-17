import { enrichmentQueue } from '../queues';
import { shouldEnrichLead } from '../services/enrichment.service';

export async function enqueueContactEnrichment(postId: string, lead?: { status?: string; platform?: string }) {
    if (lead && !shouldEnrichLead(lead)) return;

    await enrichmentQueue.add(
        `enrich-${postId}`,
        { postId },
        {
            jobId: `enrich-${postId}`,
            removeOnComplete: true,
        }
    );
}
