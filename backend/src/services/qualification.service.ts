import LeadPost from '../models/lead-post.model';
import { classifyText } from './ocr.service';
import { scheduleAutoTrain } from '../utils/auto-train.utils';
import { enqueueContactEnrichment } from '../utils/enrichment-queue.utils';

export type QualificationStatus = 'relevant' | 'irrelevant';

export interface QualificationResult {
    status: QualificationStatus;
    reason: string;
    confidence: number;
    method: 'local-ai' | 'rules';
}

const HIRING_SIGNALS = [
    /\bwe(?:'re| are) hiring\b/i,
    /\bhiring\b/i,
    /\bjob opening\b/i,
    /\bopen position\b/i,
    /\bjoin our team\b/i,
    /\bfull[- ]time\b/i,
    /\bapply now\b/i,
    /\bsend (?:your )?resume\b/i,
    /\bopen role\b/i,
    /\bvacancy\b/i,
    /\blooking for (?:a |an )?(?:candidate|engineer|developer|designer|marketer) to join\b/i,
];

const PROJECT_SIGNALS = [
    /\blooking for (?:a |an )?(?:freelancer|contractor|developer|designer|agency|consultant)\b/i,
    /\bneed (?:a |an )?(?:freelancer|developer|designer|agency|help)\b/i,
    /\bseeking (?:a |an )?(?:freelancer|contractor|developer|designer)\b/i,
    /\bproject basis\b/i,
    /\bfreelance project\b/i,
    /\boutsource\b/i,
    /\bneed someone to (?:build|create|develop|design|make)\b/i,
    /\blooking for someone to\b/i,
    /\bbudget\b/i,
    /\bpaid project\b/i,
];

function qualifyWithRules(content: string): QualificationResult {
    const text = content.trim();
    let hiringScore = 0;
    let projectScore = 0;

    for (const pattern of HIRING_SIGNALS) {
        if (pattern.test(text)) hiringScore++;
    }
    for (const pattern of PROJECT_SIGNALS) {
        if (pattern.test(text)) projectScore++;
    }

    if (hiringScore > projectScore) {
        return {
            status: 'irrelevant',
            reason: 'Rule-based check: looks like a hiring post, not a project opportunity.',
            confidence: Math.min(95, 55 + hiringScore * 15),
            method: 'rules',
        };
    }

    if (projectScore > 0) {
        return {
            status: 'relevant',
            reason: 'Rule-based check: post signals someone needs project or freelance help.',
            confidence: Math.min(95, 55 + projectScore * 15),
            method: 'rules',
        };
    }

    return {
        status: 'irrelevant',
        reason: 'Rule-based check: no clear project need detected.',
        confidence: 45,
        method: 'rules',
    };
}

export async function qualifyPostContent(content: string, _platform = 'linkedin'): Promise<QualificationResult> {
    if (!content?.trim()) {
        return {
            status: 'irrelevant',
            reason: 'Post has no content to analyze.',
            confidence: 0,
            method: 'rules',
        };
    }

    const localResult = await classifyText(content);
    if (localResult) {
        return {
            status: localResult.label,
            reason: localResult.label === 'relevant'
                ? 'Local AI detected a potential project opportunity.'
                : 'Local AI flagged this as not a project lead.',
            confidence: Math.round(localResult.confidence * 100),
            method: 'local-ai',
        };
    }

    return qualifyWithRules(content);
}

export async function qualifyLeadPost(postId: string): Promise<QualificationResult | null> {
    const post = await LeadPost.findById(postId);
    if (!post) {
        throw new Error(`Post ${postId} not found`);
    }

    console.log(`🔍 [Qualification] Analyzing post: ${post.post_id}`);

    const result = await qualifyPostContent(post.content, post.platform);

    await LeadPost.findByIdAndUpdate(postId, {
        status: result.status,
        ai_score: result.confidence,
        qualification_reason: result.reason,
        is_training_data: true,
    });

    console.log(`✅ [Qualification] ${post.post_id} → ${result.status} (${result.confidence}%) — ${result.reason}`);

    scheduleAutoTrain().catch((err) => console.error('[Qualification] Auto-train schedule failed:', err.message));

    if (result.status === 'relevant') {
        await enqueueContactEnrichment(postId, { status: 'relevant', platform: post.platform });
    }

    return result;
}
