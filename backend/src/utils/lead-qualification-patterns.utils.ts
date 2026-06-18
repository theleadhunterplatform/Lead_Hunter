export interface FreelancePatternAnalysis {
    freelanceScore: number;
    nonLeadScore: number;
    fullTimeOnlyScore: number;
    matchedFreelance: string[];
    matchedNonLead: string[];
}

const FREELANCE_LEAD_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: 'freelance', pattern: /\bfreelanc(?:e|er|ers|ing)\b/i },
    { label: 'contract', pattern: /\bcontract(?:or|ors| basis| job)?\b/i },
    { label: 'project basis', pattern: /\bproject[- ]basis\b/i },
    { label: 'gig', pattern: /\bgig\s+work\b/i },
    { label: 'outsource', pattern: /\boutsource\b/i },
    { label: 'remote freelance', pattern: /\bremote\b/i },
    { label: 'commission', pattern: /\bcommission[- ]based\b/i },
    { label: 'flexible hours', pattern: /\bflexible\s+(?:hours|working|schedule)\b/i },
    { label: 'short-term project', pattern: /\bshort[- ]term\b/i },
    { label: 'hiring freelancers', pattern: /\b(?:hiring|looking for|seeking|need).{0,40}\b(?:freelanc|contractor)\b/i },
    { label: 'freelance hiring', pattern: /\b(?:freelanc|contractor).{0,40}\b(?:hiring|required|wanted|needed)\b/i },
    { label: 'client need', pattern: /\b(?:looking for|need|seeking)\s+(?:a |an )?(?:freelancer|contractor|developer|designer|agency|consultant|specialist|expert)\b/i },
    { label: 'send portfolio', pattern: /\b(?:share|send)\s+(?:your\s+)?(?:portfolio|cv|resume)\b/i },
    { label: 'dm me', pattern: /\b(?:dm|message)\s+me\b/i },
    { label: 'paid project', pattern: /\b(?:paid|paying)\s+project\b/i },
];

const NON_LEAD_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: 'marketing tips', pattern: /\b(?:seo|marketing)\s+tips\b/i },
    { label: 'thought leadership', pattern: /\b(?:thrilled|excited|proud)\s+to\s+(?:announce|share)\b/i },
    { label: 'course promo', pattern: /\benroll\s+(?:now|today)\b/i },
    { label: 'webinar', pattern: /\b(?:webinar|masterclass|workshop)\s+(?:on|about)\b/i },
    { label: 'motivation', pattern: /\b(?:monday\s+motivation|success\s+mindset)\b/i },
];

const FULL_TIME_ONLY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: 'full-time only', pattern: /\bfull[- ]time\s+(?:only|position|role|employment)\b/i },
    { label: 'permanent role', pattern: /\bpermanent\s+(?:role|position|job)\b/i },
    { label: 'employee only', pattern: /\b(?:salaried|permanent)\s+employee\b/i },
];

function countMatches(
    text: string,
    patterns: Array<{ label: string; pattern: RegExp }>
): { score: number; matched: string[] } {
    const matched: string[] = [];
    for (const { label, pattern } of patterns) {
        if (pattern.test(text)) matched.push(label);
    }
    return { score: matched.length, matched };
}

export function analyzeFreelanceLeadPatterns(content: string): FreelancePatternAnalysis {
    const text = content.trim();
    const freelance = countMatches(text, FREELANCE_LEAD_PATTERNS);
    const nonLead = countMatches(text, NON_LEAD_PATTERNS);
    const fullTime = countMatches(text, FULL_TIME_ONLY_PATTERNS);

    return {
        freelanceScore: freelance.score,
        nonLeadScore: nonLead.score,
        fullTimeOnlyScore: fullTime.score,
        matchedFreelance: freelance.matched,
        matchedNonLead: nonLead.matched,
    };
}

export function isFreelanceLeadPattern(analysis: FreelancePatternAnalysis): boolean {
    if (analysis.nonLeadScore > 0 && analysis.freelanceScore === 0) {
        return false;
    }
    if (analysis.freelanceScore === 0) {
        return false;
    }
    if (analysis.fullTimeOnlyScore > 0 && analysis.freelanceScore < 2) {
        return false;
    }
    return true;
}

export function isNonLeadPattern(analysis: FreelancePatternAnalysis): boolean {
    return analysis.nonLeadScore > 0 && analysis.freelanceScore === 0;
}

export function buildFreelanceMatchReason(analysis: FreelancePatternAnalysis): string {
    const signals = analysis.matchedFreelance.slice(0, 4).join(', ');
    return `Freelance lead detected (${signals}). Includes company hiring freelancers, client needs, or contract work.`;
}
