/**
 * Lead buying-intent scorer — runs BEFORE the local ML classifier.
 * Confidence bands: 0–40 irrelevant | 41–70 uncertain | 71–100 relevant
 */

export type IntentCategory = 'buying' | 'recommendation' | 'employment' | 'non_lead' | 'full_time';

export interface IntentPattern {
    label: string;
    category: IntentCategory;
    pattern: RegExp;
    weight?: number;
}

export interface LeadIntentAnalysis {
    buying: string[];
    recommendation: string[];
    employment: string[];
    nonLead: string[];
    fullTime: string[];
    confidence: number;
    reasons: string[];
}

export type IntentLabel = 'RELEVANT' | 'IRRELEVANT' | 'UNCERTAIN';

export interface IntentClassification {
    label: IntentLabel;
    status: 'relevant' | 'irrelevant' | 'pending';
    confidence: number;
    reasons: string[];
    analysis: LeadIntentAnalysis;
}

const SERVICE_ROLE =
    '(?:developer|designer|agency|agencies|consultant|contractor|freelancer|specialist|expert|partner|studio|shopify|seo|ui\\/?ux|videograph(?:er|y)?|app\\s+development|marketing\\s+agency|web\\s+design(?:er)?|copywriter|strategist)';

const INTENT_PATTERNS: IntentPattern[] = [
    // ── A. Service buying intent (RELEVANT) ──
    { label: 'looking for service provider', category: 'buying', pattern: new RegExp(`\\blooking\\s+for\\s+(?:a\\s+|an\\s+)?${SERVICE_ROLE}\\b`, 'i') },
    { label: 'need a service provider', category: 'buying', pattern: new RegExp(`\\bneed\\s+(?:a\\s+|an\\s+)?${SERVICE_ROLE}\\b`, 'i') },
    { label: 'seeking service provider', category: 'buying', pattern: new RegExp(`\\bseeking\\s+(?:a\\s+|an\\s+)?${SERVICE_ROLE}\\b`, 'i') },
    { label: 'need help with project', category: 'buying', pattern: /\bneed\s+help\s+(?:with|on|building|redesigning|developing)\b/i },
    { label: 'need someone to build', category: 'buying', pattern: /\bneed\s+someone\s+to\s+(?:build|redesign|develop|create|design)\b/i },
    { label: 'need help redesigning', category: 'buying', pattern: /\bneed\s+help\s+redesigning\b/i },
    { label: 'looking for partner', category: 'buying', pattern: /\blooking\s+for\s+(?:a\s+)?(?:partner|collaborator|vendor|provider)\b/i },
    { label: 'looking for agency', category: 'buying', pattern: /\blooking\s+for\s+(?:a\s+|an\s+)?agency\b/i },
    { label: 'outsource work', category: 'buying', pattern: /\b(?:outsource|outsourcing)\b/i },
    { label: 'contract basis', category: 'buying', pattern: /\b(?:contract|project)[- ]basis\b/i },
    { label: 'freelance role', category: 'buying', pattern: /\b(?:freelanc(?:e|er|ing)|contractor)\b/i },
    { label: 'paid project', category: 'buying', pattern: /\b(?:paid|paying)\s+project\b/i },
    { label: 'project budget', category: 'buying', pattern: /\b(?:fixed|project)\s+budget\b/i },
    { label: 'hiring freelancer', category: 'buying', pattern: /\b(?:hiring|need|seeking).{0,35}\b(?:freelanc|contractor|agency|consultant)\b/i },
    { label: 'looking for dev company', category: 'buying', pattern: /\blooking\s+for\s+(?:a\s+|an\s+)?(?:app\s+development|development|design|marketing|software)\s+company\b/i },
    { label: 'seeking agency', category: 'buying', pattern: /\bseeking\s+(?:a\s+|an\s+)?(?:seo|marketing|design|creative)\s+agency\b/i },

    // ── C. Recommendation intent (RELEVANT) ──
    { label: 'can anyone recommend', category: 'recommendation', pattern: /\bcan\s+(?:anyone|somebody|someone)\s+recommend\b/i },
    { label: 'who do you recommend', category: 'recommendation', pattern: /\bwho\s+(?:do\s+you|would\s+you|can\s+you)\s+recommend\b/i },
    { label: 'looking for recommendations', category: 'recommendation', pattern: /\b(?:looking|seeking)\s+for\s+(?:recommendations?|referrals?)\b/i },
    { label: 'know anyone who can help', category: 'recommendation', pattern: /\bknow\s+anyone\s+who\s+can\s+help\b/i },
    { label: 'seeking trusted providers', category: 'recommendation', pattern: /\bseeking\s+trusted\s+providers?\b/i },
    { label: 'any recommendations for', category: 'recommendation', pattern: /\bany\s+recommendations?\s+for\b/i },
    { label: 'recommend someone', category: 'recommendation', pattern: /\brecommend\s+(?:a\s+|an\s+|someone|anyone)\b/i },
    { label: 'suggestions for provider', category: 'recommendation', pattern: /\b(?:suggestions?|referrals?)\s+for\s+(?:a\s+)?(?:good\s+)?(?:agency|developer|designer|freelancer)\b/i },

    // ── B. Employment intent (IRRELEVANT) ──
    { label: 'we are hiring', category: 'employment', pattern: /\bwe(?:'re|\s+are)\s+hiring\b/i },
    { label: 'now hiring', category: 'employment', pattern: /\bnow\s+hiring\b/i },
    { label: 'join our team', category: 'employment', pattern: /\bjoin\s+(?:our|the)\s+(?:team|company|growing\s+team)\b/i },
    { label: 'growing our team', category: 'employment', pattern: /\b(?:growing|expanding)\s+our\s+team\b/i },
    { label: 'job opening', category: 'employment', pattern: /\bjob\s+opening\b/i },
    { label: 'open position', category: 'employment', pattern: /\bopen\s+position\b/i },
    { label: 'open role title', category: 'employment', pattern: /\bopen\s+role\s*:\s*\w+/i },
    { label: 'vacancy', category: 'employment', pattern: /\bvacanc(?:y|ies)\b/i },
    { label: 'recruiting for', category: 'employment', pattern: /\brecruiting\s+for\b/i },
    { label: 'apply now job', category: 'employment', pattern: /\bapply\s+now\b(?!.*\b(?:project|freelanc|contract)\b)/i },
    { label: 'job description', category: 'employment', pattern: /\bjob\s+description\b/i },
    { label: 'careers page', category: 'employment', pattern: /\b(?:careers?|jobs?)\s+(?:page|portal|at)\b/i },
    { label: 'in-office role', category: 'employment', pattern: /\b(?:in[- ]office|on[- ]site)\s+(?:role|position)\b/i },
    { label: 'benefits package', category: 'employment', pattern: /\b(?:benefits?\s+package|health\s+insurance|pto)\b/i },
    { label: 'salary range', category: 'employment', pattern: /\bsalary\s+range\b/i },
    { label: 'equity compensation', category: 'employment', pattern: /\b(?:equity|stock\s+options)\s+(?:package|offered)\b/i },
    { label: 'hiring full-time employee', category: 'employment', pattern: /\bhiring\s+(?:a\s+)?(?:full[- ]time|permanent)\b/i },

    // ── Full-time / permanent (strong IRRELEVANT) ──
    { label: 'full-time role', category: 'full_time', pattern: /\bfull[- ]time\s+(?:role|position|job|employment|developer|designer|engineer)\b/i },
    { label: 'part-time employee', category: 'full_time', pattern: /\bpart[- ]time\s+(?:role|position|employee)\b/i },
    { label: 'permanent position', category: 'full_time', pattern: /\bpermanent\s+(?:role|position|job)\b/i },
    { label: 'salaried employee', category: 'full_time', pattern: /\bsalaried\s+(?:role|position|employee)\b/i },
    { label: 'fte hire', category: 'full_time', pattern: /\b(?:fte|headcount)\b/i },

    // ── General content / announcements (IRRELEVANT) ──
    { label: 'product launch', category: 'non_lead', pattern: /\b(?:product|feature)\s+launch\b/i },
    { label: 'company milestone', category: 'non_lead', pattern: /\b(?:milestone|anniversary|years?\s+strong)\b/i },
    { label: 'proud to announce', category: 'non_lead', pattern: /\b(?:proud|thrilled|excited)\s+to\s+(?:announce|share)\b/i },
    { label: 'career advice', category: 'non_lead', pattern: /\b(?:career\s+advice|job\s+search\s+tips|interview\s+tips)\b/i },
    { label: 'industry discussion', category: 'non_lead', pattern: /\b(?:hot\s+take|unpopular\s+opinion|thoughts?\s+on\s+the\s+industry)\b/i },
    { label: 'marketing tips', category: 'non_lead', pattern: /\b(?:seo|marketing)\s+tips\b/i },
    { label: 'webinar promo', category: 'non_lead', pattern: /\b(?:webinar|masterclass|workshop)\s+(?:on|about|register)\b/i },
    { label: 'course promo', category: 'non_lead', pattern: /\benroll\s+(?:now|today)\b/i },
    { label: 'personal celebration', category: 'non_lead', pattern: /\b(?:just\s+joined|excited\s+to\s+share\s+that\s+i|started\s+my\s+new\s+role)\b/i },
    { label: 'self promotion', category: 'non_lead', pattern: /\b(?:follow\s+me|subscribe\s+to|my\s+newsletter)\b/i },
    { label: 'motivation post', category: 'non_lead', pattern: /\b(?:monday\s+motivation|success\s+mindset)\b/i },
];

const CATEGORY_WEIGHT: Record<IntentCategory, number> = {
    buying: 11,
    recommendation: 13,
    employment: -20,
    non_lead: -15,
    full_time: -24,
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function extractLeadIntent(content: string): LeadIntentAnalysis {
    const text = content.trim();
    const buying: string[] = [];
    const recommendation: string[] = [];
    const employment: string[] = [];
    const nonLead: string[] = [];
    const fullTime: string[] = [];

    for (const { label, category, pattern } of INTENT_PATTERNS) {
        if (!pattern.test(text)) continue;
        switch (category) {
            case 'buying': buying.push(label); break;
            case 'recommendation': recommendation.push(label); break;
            case 'employment': employment.push(label); break;
            case 'non_lead': nonLead.push(label); break;
            case 'full_time': fullTime.push(label); break;
        }
    }

    const reasons: string[] = [];
    let confidence = 50;

    for (const label of buying) {
        confidence += CATEGORY_WEIGHT.buying;
        reasons.push(`contains buying intent: ${label}`);
    }
    for (const label of recommendation) {
        confidence += CATEGORY_WEIGHT.recommendation;
        reasons.push(`contains recommendation intent: ${label}`);
    }
    for (const label of employment) {
        confidence += CATEGORY_WEIGHT.employment;
        reasons.push(`contains employment intent: ${label}`);
    }
    for (const label of nonLead) {
        confidence += CATEGORY_WEIGHT.non_lead;
        reasons.push(`contains non-lead content: ${label}`);
    }
    for (const label of fullTime) {
        confidence += CATEGORY_WEIGHT.full_time;
        reasons.push(`contains full-time employment signal: ${label}`);
    }

    const serviceSignals = buying.length + recommendation.length;
    const jobSignals = employment.length + fullTime.length;

    // Precision: employment posts without buying/recommendation signals → irrelevant
    if (jobSignals >= 1 && serviceSignals === 0) {
        confidence = Math.min(confidence, 28);
        if (!reasons.some((r) => r.includes('employment') || r.includes('full-time'))) {
            reasons.push('employment signals without service-buying intent');
        }
    }

    if (jobSignals >= 2) {
        confidence = Math.min(confidence, 18);
        reasons.push('multiple employment signals — treated as job posting');
    }

    // Precision: strong buying without employment → relevant
    if (serviceSignals >= 2 && jobSignals === 0) {
        confidence = Math.max(confidence, 82);
    } else if (serviceSignals >= 1 && jobSignals === 0 && nonLead.length === 0) {
        confidence = Math.max(confidence, 74);
    }

    // Mixed: employment + buying — only relevant if buying clearly dominates
    if (jobSignals >= 1 && serviceSignals >= 1) {
        confidence = clamp(confidence, 38, 62);
        reasons.push('mixed employment and buying signals — needs manual review');
    }

    confidence = clamp(Math.round(confidence), 0, 100);

    if (reasons.length === 0) {
        reasons.push('no clear buying, employment, or content signals detected');
    }

    return {
        buying,
        recommendation,
        employment,
        nonLead,
        fullTime,
        confidence,
        reasons,
    };
}

export function confidenceToLabel(confidence: number): IntentLabel {
    if (confidence <= 40) return 'IRRELEVANT';
    if (confidence <= 70) return 'UNCERTAIN';
    return 'RELEVANT';
}

export function confidenceToStatus(confidence: number): 'relevant' | 'irrelevant' | 'pending' {
    const label = confidenceToLabel(confidence);
    if (label === 'RELEVANT') return 'relevant';
    if (label === 'IRRELEVANT') return 'irrelevant';
    return 'pending';
}

export function classifyLeadIntent(content: string): IntentClassification {
    const analysis = extractLeadIntent(content);
    const label = confidenceToLabel(analysis.confidence);
    const status = confidenceToStatus(analysis.confidence);

    return {
        label,
        status,
        confidence: analysis.confidence,
        reasons: analysis.reasons,
        analysis,
    };
}

export function buildIntentReason(classification: IntentClassification): string {
    const top = classification.reasons.slice(0, 3).join('; ');
    return `${classification.label} (${classification.confidence}%): ${top}`;
}

export function logQualificationDecision(
    content: string,
    classification: IntentClassification,
    extras?: { method?: string; aiLabel?: string; aiConfidence?: number; platform?: string }
) {
    const preview = content.trim().replace(/\s+/g, ' ').slice(0, 280);
    console.log(
        JSON.stringify(
            {
                event: 'lead_qualification',
                platform: extras?.platform,
                text_preview: preview,
                intent_signals: {
                    buying: classification.analysis.buying,
                    recommendation: classification.analysis.recommendation,
                    employment: classification.analysis.employment,
                    non_lead: classification.analysis.nonLead,
                    full_time: classification.analysis.fullTime,
                },
                decision: {
                    label: classification.label,
                    status: classification.status,
                    confidence: classification.confidence,
                    method: extras?.method,
                },
                reasons: classification.reasons,
                local_ai: extras?.aiLabel
                    ? { label: extras.aiLabel, confidence: extras.aiConfidence }
                    : undefined,
            },
            null,
            2
        )
    );
}
