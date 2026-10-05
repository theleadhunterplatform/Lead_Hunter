import LeadPost from '../models/lead-post.model';
import { classifyText } from './ocr.service';
import { shouldEnrichLead } from './enrichment.service';
import { scheduleAutoTrain } from '../utils/auto-train.utils';
import { isLocalAiModelReady } from './ai-training.service';
import { enqueueContactEnrichment } from '../utils/enrichment-queue.utils';
import { isAutoEnrichmentEnabled } from '../utils/automation-settings.utils';
import {
    classifyLeadIntent,
    confidenceToStatus,
    buildIntentReason,
    logQualificationDecision,
    isBuyerSeekingContractorPartnerAgency,
    hasFreelanceProjectBuyerContext,
    isHardRelevantLead,
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

/** Minimum model confidence to drive qualification when trained. */
const AI_TRUST_MIN = 0.7;
/** Strong enough to override high-confidence rule disagreements. */
const AI_OVERRIDE_MIN = 0.78;

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

function pendingReviewResult(intent: IntentClassification, note: string): QualificationResult {
    const reasons = [...intent.reasons, note];
    return {
        status: 'pending',
        label: 'UNCERTAIN',
        confidence: intent.confidence,
        reasons,
        method: 'uncertain',
        reason: `UNCERTAIN (${intent.confidence}%): ${note}`,
    };
}

/** Employment-only and clear seller posts — never overridden by the learned model. */
function isHardIrrelevant(intent: IntentClassification, content?: string): boolean {
    if (content && (isBuyerSeekingContractorPartnerAgency(content) || hasFreelanceProjectBuyerContext(content))) {
        return false;
    }

    const { analysis } = intent;
    const serviceSignals = analysis.buying.length + analysis.recommendation.length;
    const jobSignals = analysis.employment.length + analysis.fullTime.length;

    if (jobSignals >= 1 && serviceSignals === 0) return true;
    if (serviceSignals === 0 && analysis.nonLead.length >= 2 && jobSignals === 0) return true;

    return false;
}

function buildAiDrivenResult(
    intent: IntentClassification,
    aiLabel: string,
    aiConfidencePct: number,
    note: string
): QualificationResult {
    const reasons = [...intent.reasons, note];
    const confidence = Math.round(Math.max(intent.confidence, aiConfidencePct));
    const status = aiLabel === 'relevant' ? 'relevant' : 'irrelevant';
    const label = status === 'relevant' ? 'RELEVANT' : 'IRRELEVANT';

    return {
        status,
        label,
        confidence,
        reasons,
        method: 'local-ai',
        reason: `${label} (${confidence}%): ${note}`,
    };
}

function applyAiNudge(
    intent: IntentClassification,
    aiLabel: string,
    aiConfidencePct: number,
    content: string
): QualificationResult {
    const { analysis } = intent;
    const jobSignals = analysis.employment.length + analysis.fullTime.length;
    const serviceSignals = analysis.buying.length + analysis.recommendation.length;
    let confidence = intent.confidence;
    const reasons = [...intent.reasons];
    let method: QualificationResult['method'] = 'intent+ai';

    const aiProb = aiConfidencePct / 100;
    const hardBuyer = isHardRelevantLead(content, intent);

    if (hardBuyer) {
        const result = intentToResult(
            { ...intent, confidence: Math.max(intent.confidence, 71), status: 'relevant', label: 'RELEVANT' },
            'intent-rules'
        );
        result.reasons.push('strong freelance/project buyer — protected from model downgrade');
        result.reason = buildIntentReason({ ...intent, ...result, status: 'relevant', label: 'RELEVANT' });
        return result;
    }

    if (aiLabel === 'irrelevant' && aiProb >= AI_OVERRIDE_MIN) {
        confidence = Math.max(0, confidence - 15);
        reasons.push(`trained model supports irrelevant (${aiConfidencePct}%)`);
    } else if (
        aiLabel === 'relevant'
        && aiProb >= AI_OVERRIDE_MIN
        && jobSignals === 0
        && serviceSignals >= 1
    ) {
        confidence = Math.min(100, confidence + 15);
        reasons.push(`trained model supports relevant (${aiConfidencePct}%)`);
    } else if (aiLabel === 'relevant' && aiProb >= AI_TRUST_MIN) {
        confidence = Math.min(100, confidence + 10);
        reasons.push(`trained model leans relevant (${aiConfidencePct}%)`);
    } else if (aiLabel === 'irrelevant' && aiProb >= AI_TRUST_MIN) {
        confidence = Math.max(0, confidence - 10);
        reasons.push(`trained model leans irrelevant (${aiConfidencePct}%)`);
    } else {
        reasons.push(`trained model inconclusive (${aiLabel} ${aiConfidencePct}%)`);
        method = 'uncertain';
    }

    confidence = Math.round(confidence);
    let status = confidenceToStatus(confidence);

    if (status === 'pending' || (method === 'uncertain' && confidence > 40 && confidence <= 70)) {
        return pendingReviewResult(
            { ...intent, confidence, reasons },
            'AI unsure — label this lead to improve the model'
        );
    }

    const label = status === 'relevant' ? 'RELEVANT' : 'IRRELEVANT';

    return {
        status,
        label,
        confidence,
        reasons,
        method,
        reason: buildIntentReason({ ...intent, label, status, confidence, reasons }),
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

    if (isHardIrrelevant(intent, content)) {
        const result = intentToResult(intent, 'intent-rules');
        logQualificationDecision(content, intent, { method: result.method, platform });
        return result;
    }

    if (isHardRelevantLead(content, intent)) {
        const boosted = {
            ...intent,
            confidence: Math.max(intent.confidence, 71),
            status: 'relevant' as const,
            label: 'RELEVANT' as const,
        };
        const result = intentToResult(boosted, 'intent-rules');
        result.reasons.push('rules: strong buyer / freelance project hire');
        logQualificationDecision(content, boosted, { method: result.method, platform });
        return result;
    }

    const modelReady = await isLocalAiModelReady();
    const localResult = modelReady ? await classifyText(content) : null;

    if (localResult) {
        const aiConfidencePct = Math.round(localResult.confidence * 100);
        const aiProb = localResult.confidence;

        if (localResult.label === 'relevant' && aiProb >= AI_TRUST_MIN) {
            const result = buildAiDrivenResult(
                intent,
                localResult.label,
                aiConfidencePct,
                `trained model: relevant (${aiConfidencePct}%)`
            );
            logQualificationDecision(content, intent, {
                method: result.method,
                platform,
                aiLabel: localResult.label,
                aiConfidence: aiConfidencePct,
            });
            return result;
        }

        if (localResult.label === 'irrelevant' && aiProb >= AI_TRUST_MIN) {
            const result = buildAiDrivenResult(
                intent,
                localResult.label,
                aiConfidencePct,
                `trained model: irrelevant (${aiConfidencePct}%)`
            );
            logQualificationDecision(content, intent, {
                method: result.method,
                platform,
                aiLabel: localResult.label,
                aiConfidence: aiConfidencePct,
            });
            return result;
        }

        if (intent.confidence <= 40 && localResult.label === 'relevant' && aiProb >= AI_OVERRIDE_MIN) {
            const result = buildAiDrivenResult(
                intent,
                localResult.label,
                aiConfidencePct,
                `trained model override: relevant (${aiConfidencePct}%) despite rule score ${intent.confidence}%`
            );
            logQualificationDecision(content, intent, {
                method: result.method,
                platform,
                aiLabel: localResult.label,
                aiConfidence: aiConfidencePct,
            });
            return result;
        }

        if (intent.confidence >= 71 && localResult.label === 'irrelevant' && aiProb >= AI_OVERRIDE_MIN) {
            const result = buildAiDrivenResult(
                intent,
                localResult.label,
                aiConfidencePct,
                `trained model override: irrelevant (${aiConfidencePct}%) despite rule score ${intent.confidence}%`
            );
            logQualificationDecision(content, intent, {
                method: result.method,
                platform,
                aiLabel: localResult.label,
                aiConfidence: aiConfidencePct,
            });
            return result;
        }

        if (intent.confidence <= 70) {
            const result = applyAiNudge(intent, localResult.label, aiConfidencePct, content);
            logQualificationDecision(content, intent, {
                method: result.method,
                platform,
                aiLabel: localResult.label,
                aiConfidence: aiConfidencePct,
            });
            return result;
        }
    }

    if (intent.confidence <= 40 || intent.confidence >= 71) {
        const result = intentToResult(intent, 'intent-rules');
        logQualificationDecision(content, intent, { method: result.method, platform });
        return result;
    }

    const result = pendingReviewResult(intent, 'rules inconclusive — label this lead to train the AI');
    if (!modelReady) {
        result.reasons.push('local AI not trained yet — label leads and train to improve future scrapes');
    } else if (!localResult) {
        result.reasons.push('local AI unavailable — intent score only');
    }
    logQualificationDecision(content, intent, { method: result.method, platform });
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
        if (shouldEnrichLead(post)) {
            updateData.enrichment_status = 'pending';
            updateData.enrichment_message = null;
        }
    } else if (result.status === 'pending') {
        updateData.review_status = null;
        updateData.is_training_data = false;
    } else {
        updateData.review_status = null;
        updateData.is_training_data = true;
    }

    await LeadPost.findByIdAndUpdate(postId, updateData);

    console.log(
        `✅ [Qualification] ${post.post_id} → ${result.label} (${result.confidence}%) [${result.method}] — ${result.reasons.slice(0, 3).join('; ')}`
    );

    if (result.status === 'relevant' || result.status === 'irrelevant') {
        scheduleAutoTrain().catch((err) => console.error('[AutoTrain] Schedule failed:', err.message));
    }

    if (result.status === 'relevant' && shouldEnrichLead(post) && (await isAutoEnrichmentEnabled())) {
        await enqueueContactEnrichment(postId, {
            status: 'relevant',
            platform: post.platform,
        });
    }

    return result;
}
