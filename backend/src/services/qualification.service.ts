import LeadPost from '../models/lead-post.model';
import { classifyText } from './ocr.service';
import { enqueueContactEnrichment } from '../utils/enrichment-queue.utils';
import {
    analyzeFreelanceLeadPatterns,
    buildFreelanceMatchReason,
    isFreelanceLeadPattern,
    isNonLeadPattern,
} from '../utils/lead-qualification-patterns.utils';

export type QualificationStatus = 'relevant' | 'irrelevant';

export interface QualificationResult {
    status: QualificationStatus;
    reason: string;
    confidence: number;
    method: 'local-ai' | 'rules' | 'rules+ai';
}

function patternConfidence(analysis: ReturnType<typeof analyzeFreelanceLeadPatterns>): number {
    return Math.min(92, 58 + analysis.freelanceScore * 8);
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

    const patterns = analyzeFreelanceLeadPatterns(content);

    if (isNonLeadPattern(patterns)) {
        return {
            status: 'irrelevant',
            reason: `Not a freelancer lead (${patterns.matchedNonLead.join(', ')}).`,
            confidence: Math.min(90, 55 + patterns.nonLeadScore * 12),
            method: 'rules',
        };
    }

    if (isFreelanceLeadPattern(patterns)) {
        return {
            status: 'relevant',
            reason: buildFreelanceMatchReason(patterns),
            confidence: patternConfidence(patterns),
            method: 'rules',
        };
    }

    const localResult = await classifyText(content);
    if (localResult) {
        const aiConfidence = Math.round(localResult.confidence * 100);

        if (localResult.label === 'irrelevant' && patterns.freelanceScore > 0) {
            return {
                status: 'relevant',
                reason: `${buildFreelanceMatchReason(patterns)} Local AI was unsure (${aiConfidence}%).`,
                confidence: Math.max(60, aiConfidence, patternConfidence(patterns)),
                method: 'rules+ai',
            };
        }

        if (localResult.label === 'relevant') {
            return {
                status: 'relevant',
                reason: patterns.freelanceScore > 0
                    ? `Local AI and freelance patterns agree this is a freelancer lead.`
                    : 'Local AI detected a potential freelancer lead.',
                confidence: aiConfidence,
                method: 'local-ai',
            };
        }

        return {
            status: 'irrelevant',
            reason: patterns.freelanceScore > 0
                ? `Local AI flagged this as not a freelancer lead (${aiConfidence}%). Mark Relevant to teach the model.`
                : `Local AI flagged this as not a freelancer lead (${aiConfidence}%).`,
            confidence: aiConfidence,
            method: 'local-ai',
        };
    }

    if (patterns.freelanceScore > 0) {
        return {
            status: 'relevant',
            reason: buildFreelanceMatchReason(patterns),
            confidence: patternConfidence(patterns),
            method: 'rules',
        };
    }

    return {
        status: 'irrelevant',
        reason: 'No freelancer hiring or project signals detected. Mark Relevant if this is a good lead.',
        confidence: 45,
        method: 'rules',
    };
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
    });

    console.log(`✅ [Qualification] ${post.post_id} → ${result.status} (${result.confidence}%) — ${result.reason}`);

    if (result.status === 'relevant') {
        await enqueueContactEnrichment(postId, { status: 'relevant', platform: post.platform });
    }

    return result;
}
