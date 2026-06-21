/**
 * @deprecated Use lead-intent-scoring.utils.ts — kept for backward compatibility.
 */
export {
    extractLeadIntent as analyzeFreelanceLeadPatterns,
    classifyLeadIntent,
} from './lead-intent-scoring.utils';

import type { LeadIntentAnalysis } from './lead-intent-scoring.utils';

export type FreelancePatternAnalysis = LeadIntentAnalysis & {
    freelanceScore: number;
    nonLeadScore: number;
    fullTimeOnlyScore: number;
    matchedFreelance: string[];
    matchedNonLead: string[];
};

export function isFreelanceLeadPattern(analysis: LeadIntentAnalysis): boolean {
    return analysis.confidence >= 71;
}

export function isNonLeadPattern(analysis: LeadIntentAnalysis): boolean {
    return analysis.confidence <= 40 && analysis.buying.length === 0 && analysis.recommendation.length === 0;
}

export function buildFreelanceMatchReason(analysis: LeadIntentAnalysis): string {
    return analysis.reasons.slice(0, 3).join('; ') || 'Service buying intent detected';
}
