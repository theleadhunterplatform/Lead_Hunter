import LeadPost from '../models/lead-post.model';
import { classifyText } from './ocr.service';
import { enqueueContactEnrichment } from '../utils/enrichment-queue.utils';
import { scheduleAutoTrain } from '../utils/auto-train.utils';
import {
    classifyLeadIntent,
    confidenceToStatus,
    buildIntentReason,
    logQualificationDecision,
    type IntentClassification,
} from '../utils/lead-intent-scoring.utils';

export type QualificationStatus = 'relevant' | 'irrelevant' | 'pending';

export interface QualificationResult {
    status: QualificationStatus;
    reason: string;
    confidence: number;
    method: 'intent-rules' | 'intent+ai' | 'local-ai' | 'uncertain';
    reasons: string[];
    label: 'RELEVANT' | 'IRRELEVANT' | 'UNCERTAIN';
}

const AI_NUDGE_MIN = 0.78;

/**
 * Local ML is only consulted in the uncertain band (41–70) to nudge precision.
 * Intent rules always run first.
 */
function applyAiNudge(
    intent: IntentClassification,
    aiLabel: string,
    aiConfidencePct: number
): QualificationResult {
    const { analysis } = intent;
    const jobSignals = analysis.employment.length + analysis.fullTime.length;
    const serviceSignals = analysis.buying.length + analysis.recommendation.length;
    let confidence = intent.confidence;
    const reasons = [...intent.reasons];
    let method: QualificationResult['method'] = 'uncertain';

    const aiProb = aiConfidencePct / 100;

    if (aiLabel === 'irrelevant' && aiProb >= AI_NUDGE_MIN) {
        confidence = Math.max(0, confidence - 12);
        reasons.push(`local AI supports irrelevant (${aiConfidencePct}%)`);
        method = 'intent+ai';
    } else if (
        aiLabel === 'relevant'
        && aiProb >= AI_NUDGE_MIN
        && jobSignals === 0
        && serviceSignals >= 1
    ) {
        confidence = Math.min(100, confidence + 10);
        reasons.push(`local AI supports relevant (${aiConfidencePct}%)`);
        method = 'intent+ai';
    } else {
        reasons.push(`local AI inconclusive (${aiLabel} ${aiConfidencePct}%) — manual review recommended`);
    }

    confidence = Math.round(confidence);
    const status = confidenceToStatus(confidence);
    const label = status === 'relevant' ? 'RELEVANT' : status === 'irrelevant' ? 'IRRELEVANT' : 'UNCERTAIN';

    return {
        status,
        label,
        confidence,
        reasons,
        method,
        reason: buildIntentReason({ ...intent, label, status, confidence, reasons }),
    };
}

function intentToResult(intent: IntentClassification, method: QualificationResult['method']): QualificationResult {
    return {
        status: intent.status,
        label: intent.label,
        confidence: intent.confidence,
        reasons: intent.reasons,
        method,
        reason: buildIntentReason(intent),
    };
}

export async function qualifyPostContent(content: string, platform = 'linkedin'): Promise<QualificationResult> {
    if (!content?.trim()) {
        return {
            status: 'irrelevant',
            label: 'IRRELEVANT',
            reason: 'IRRELEVANT (0%): post has no content to analyze',
            confidence: 0,
            method: 'intent-rules',
            reasons: ['empty content'],
        };
    }

    const intent = classifyLeadIntent(content);

    // High-confidence intent decision — skip ML (precision-first)
    if (intent.confidence <= 40 || intent.confidence >= 71) {
        const result = intentToResult(intent, 'intent-rules');
        logQualificationDecision(content, intent, { method: result.method, platform });
        return result;
    }

    // Uncertain band (41–70): optional ML nudge
    const localResult = await classifyText(content);
    if (localResult) {
        const aiConfidencePct = Math.round(localResult.confidence * 100);
        const result = applyAiNudge(intent, localResult.label, aiConfidencePct);
        logQualificationDecision(content, intent, {
            method: result.method,
            platform,
            aiLabel: localResult.label,
            aiConfidence: aiConfidencePct,
        });
        return result;
    }

    const result = intentToResult(intent, 'uncertain');
    result.reasons.push('local AI unavailable — intent score only');
    logQualificationDecision(content, intent, { method: 'uncertain', platform });
    return result;
}

export async function qualifyLeadPost(postId: string): Promise<QualificationResult | null> {
    const post = await LeadPost.findById(postId);
    if (!post) {
        throw new Error(`Post ${postId} not found`);
    }

    console.log(`🔍 [Qualification] Analyzing post: ${post.post_id}`);

    const result = await qualifyPostContent(post.content, post.platform);

    const updateData: Record<string, unknown> = {
        status: result.status,
        ai_score: result.confidence,
        qualification_reason: result.reason,
    };

    if (result.status === 'relevant') {
        updateData.review_status = 'awaiting_review';
        updateData.is_training_data = true;
    } else {
        updateData.review_status = null;
    }

    if (result.status === 'irrelevant') {
        updateData.is_training_data = true;
    }

    await LeadPost.findByIdAndUpdate(postId, updateData);

    console.log(
        `✅ [Qualification] ${post.post_id} → ${result.label} (${result.confidence}%) [${result.method}] — ${result.reasons.slice(0, 3).join('; ')}`
    );

    if (result.status === 'relevant') {
        await enqueueContactEnrichment(postId, { status: 'relevant', platform: post.platform });
        scheduleAutoTrain().catch((err) => console.error('[AutoTrain] Schedule failed:', err.message));
    } else if (result.status === 'irrelevant') {
        scheduleAutoTrain().catch((err) => console.error('[AutoTrain] Schedule failed:', err.message));
    }

    return result;
}
