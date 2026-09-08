import { intelligenceQueue } from '../queues';
import LeadPost from '../models/lead-post.model';
import { generateLeadIntelligence } from '../services/intelligence.service';
import config from '../config';
import ErrorResponse from '../utils/error-response.utils';

import { getSetting } from '../services/setting.service';

async function assertAiConfigured(): Promise<void> {
    const dbKey = await getSetting('openrouter_api_key').catch(() => null);
    const hasOpenRouter = Boolean((dbKey as string) || config.openRouter.apiKey?.trim());
    const hasGroq = Boolean(config.groq.apiKey?.trim());
    const hasGemini = Boolean(config.gemini.apiKey?.trim());

    if (!hasOpenRouter && !hasGroq && !hasGemini) {
        throw new ErrorResponse(
            'No AI provider configured. Set OPEN_ROUTER_API, GROQ_API_KEY, or GEMINI_API_KEY in backend/.env',
            503
        );
    }
}

async function removeStaleIntelJob(postId: string) {
    try {
        const jobs = await intelligenceQueue.getJobs(['failed', 'completed', 'waiting', 'delayed']);
        for (const job of jobs) {
            if (job.data?.postId === postId || job.id?.startsWith(`intel-${postId}`)) {
                await job.remove().catch(() => undefined);
            }
        }
    } catch {
        // ignore
    }
}

export async function enqueueLeadIntelligence(postId: string, _options?: { force?: boolean }) {
    await removeStaleIntelJob(postId);

    const jobId = `intel-${postId}-${Date.now()}`;

    await intelligenceQueue.add(
        jobId,
        { postId },
        {
            jobId,
            removeOnComplete: true,
            removeOnFail: true,
        }
    );
    console.log(`📥 [IntelligenceQueue] Enqueued job ${jobId} for post ${postId}`);
}

/** Queue intel generation, or run inline when Redis/workers are unavailable. */
export async function requestLeadIntelligence(postId: string, options?: { force?: boolean }) {
    const post = await LeadPost.findById(postId);
    if (!post) {
        throw new Error(`Post not found: ${postId}`);
    }

    if (post.intelligence && !options?.force) {
        return { mode: 'ready' as const, post };
    }

    await assertAiConfigured();

    try {
        await enqueueLeadIntelligence(postId, options);
        return { mode: 'queued' as const, post };
    } catch (error: any) {
        console.warn(`[Intelligence] Queue unavailable for ${postId}, running inline:`, error?.message || error);
        await generateLeadIntelligence(post);
        const refreshed = await LeadPost.findById(postId);
        return { mode: 'inline' as const, post: refreshed || post };
    }
}
