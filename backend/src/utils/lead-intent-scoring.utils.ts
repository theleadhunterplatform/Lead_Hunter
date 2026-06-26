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
    '(?:developer|designer|agency|agencies|consultant|contractor|freelancer|freelance|specialist|expert|partner|studio|shopify|seo|ui\\/?ux|videograph(?:er|y)?|video\\s+editor|social\\s+media\\s+manager|editor|intern|app\\s+development|marketing\\s+agency|web\\s+design(?:er)?|website\\s+developer|website\\s+designer|website\\s+development|wordpress\\s+developer|e[- ]?commerce|marketing\\s+manager|copywriter|strategist|co[- ]?founder|tech(?:nology)?\\s+partner|technical\\s+partner)';

/** Project / freelance hire context — distinguishes buyer posts from full-time job listings. */
export function hasFreelanceProjectBuyerContext(content: string): boolean {
    const text = content.trim();
    if (!text) return false;

    if (/\b(?:available\s+for|offering)\s+(?:freelance|contract|projects?|work)\b/i.test(text)) return false;
    if (
        /\b(?:dm\s+me|contact\s+me)\s+for\s+(?:details|work|projects?)\b/i.test(text) &&
        !/\b(?:looking\s+for|seeking|need(?:ing)?|hiring|interested\s+candidates)\b/i.test(text)
    ) {
        return false;
    }

    return (
        /\b(?:freelanc(?:e|er|ing)?|contract(?:or|[- ]?remote|[- ]?basis)?|outside\s+ir35|ir35)\b/i.test(text) ||
        /\b(?:£|\$|€)\s*\d+[\d,.]*\s*(?:per\s+day|\/day|p\/d)\b/i.test(text) ||
        /\b\d+[\s-]*(?:day|week|month)\s+contract\b/i.test(text) ||
        /\bproject[- ]based\b/i.test(text) ||
        /\b(?:share|send)\s+(?:me\s+)?(?:your\s+)?portfolio\b/i.test(text) ||
        /\b(?:portfolio|estimate|pricing|timeline).{0,40}\b(?:dm|message|email|comment)\b/i.test(text) ||
        /\b(?:dm|message|email|comment).{0,60}\b(?:portfolio|estimate|pricing)\b/i.test(text) ||
        /\binterested\s+candidates?\b/i.test(text) ||
        /\blooking\s+to\s+(?:develop|build|create|redesign)\b/i.test(text) ||
        /\bneed\s+(?:a\s+)?quick\s+estimate\b/i.test(text) ||
        /\bhiring\s*:\s*\w+/i.test(text) ||
        /\b(?:intern|freelancer)\s*\/\s*(?:freelancer|intern)\b/i.test(text) ||
        /\bportfolios?\s+to\s+\S+@/i.test(text) ||
        /\b(?:discuss|share)\s+your\s+(?:experience|portfolio|pricing|examples)\b/i.test(text)
    );
}

/** Buyer wants a freelancer, agency, or partner (not a full-time employee posting). */
export const BUYER_SEEKS_CONTRACTOR_PARTNER_PATTERN =
    /\b(?:(?:looking|searching)\s+for|seeking|need(?:ing)?|want\s+to\s+(?:hire|connect\s+with)|(?:we(?:'re|\s+are)|i(?:'m|\s+am))\s+(?:looking|seeking|hiring)|hiring)\b[\s\S]{0,140}\b(?:freelanc(?:e|er|ing)?|contract(?:or| basis)?|agenc(?:y|ies)|partner|co[- ]?founder|technical\s+co[- ]?founder|technology\s+partner|tech(?:nology)?\s+partner|development\s+(?:agency|company|companies)|web\s+development\s+(?:agency|company|companies))\b/i;

export function isBuyerSeekingContractorPartnerAgency(content: string): boolean {
    const text = content.trim();
    if (!text) return false;

    // Seller pitching their agency/freelancers — not a buyer lead
    if (/\bhire\s+(?:us|me|our)\b/i.test(text)) return false;
    if (/\b(?:our\s+agency\s+(?:specializes|helps|builds)|verified\s+freelancers\s+ready\s+to\s+deliver)\b/i.test(text)) {
        return false;
    }

    if (BUYER_SEEKS_CONTRACTOR_PARTNER_PATTERN.test(text)) return true;

    if (hasFreelanceProjectBuyerContext(text)) {
        const hiresRole =
            /\b(?:looking\s+for|seeking|need(?:ing)?|hiring|want\s+to\s+hire|requirement)\b/i.test(text) ||
            /\b(?:developer|designer|editor|freelanc|contract|agency|intern|wordpress|e[- ]?commerce|website)\b/i.test(
                text
            );
        if (hiresRole) return true;
    }

    const hasBuyerVerb =
        /\b(?:looking\s+for|looking\s+to\s+(?:develop|build|create)|seeking|need(?:ing)?|hiring|want\s+to\s+hire)\b/i.test(
            text
        );
    const hasTarget =
        /\b(?:freelanc(?:e|er|ing)?|agenc(?:y|ies)|partner|co[- ]?founder|technical\s+partner|technology\s+partner|development\s+compan(?:y|ies)|app\s+development\s+companies|web\s+development)\b/i.test(
            text
        );
    return hasBuyerVerb && hasTarget;
}

const INTENT_PATTERNS: IntentPattern[] = [
    // ── A. Service buying intent (RELEVANT) ──
    { label: 'looking for service provider', category: 'buying', pattern: new RegExp(`\\blooking\\s+for\\s+(?:a\\s+|an\\s+)?${SERVICE_ROLE}\\b`, 'i') },
    { label: 'looking for skilled provider', category: 'buying', pattern: new RegExp(`\\blooking\\s+for\\s+(?:a\\s+|an\\s+)?(?:\\w+\\s+){0,4}${SERVICE_ROLE}\\b`, 'i') },
    { label: 'need a service provider', category: 'buying', pattern: new RegExp(`\\bneed\\s+(?:a\\s+|an\\s+)?${SERVICE_ROLE}\\b`, 'i') },
    { label: 'seeking service provider', category: 'buying', pattern: new RegExp(`\\bseeking\\s+(?:a\\s+|an\\s+)?${SERVICE_ROLE}\\b`, 'i') },
    { label: 'need help with project', category: 'buying', pattern: /\bneed\s+help\s+(?:with|on|building|redesigning|developing)\b/i },
    { label: 'need someone to build', category: 'buying', pattern: /\bneed\s+someone\s+to\s+(?:build|redesign|develop|create|design)\b/i },
    { label: 'need help redesigning', category: 'buying', pattern: /\bneed\s+help\s+redesigning\b/i },
    { label: 'looking for partner', category: 'buying', pattern: /\blooking\s+for\s+(?:a\s+)?(?:partner|collaborator|vendor|provider)\b/i },
    { label: 'looking for agency', category: 'buying', pattern: /\blooking\s+for\s+(?:a\s+|an\s+)?agency\b/i },
    { label: 'outsource work', category: 'buying', pattern: /\b(?:outsource|outsourcing)\b/i },
    { label: 'contract basis', category: 'buying', pattern: /\b(?:contract|project)[- ]basis\b/i },
    { label: 'paid project', category: 'buying', pattern: /\b(?:paid|paying)\s+project\b/i },
    { label: 'project budget', category: 'buying', pattern: /\b(?:fixed|project)\s+budget\b/i },
    { label: 'hiring freelancer', category: 'buying', pattern: /\b(?:hiring|need|seeking|looking\s+for).{0,80}\b(?:freelanc|contractor|agency|consultant)\b/i },
    { label: 'looking for freelancer', category: 'buying', pattern: /\blooking\s+for\s+(?:an?\s+)?(?:experienced\s+)?(?:freelanc|contract(?:or| basis))\b/i },
    { label: 'seeking freelance developer', category: 'buying', pattern: /\b(?:seeking|need(?:ing)?)\s+(?:a\s+)?freelanc/i },
    { label: 'freelance developer needed', category: 'buying', pattern: /\bfreelanc(?:e|er)\s+.{0,40}\b(?:needed|wanted|required)\b/i },
    { label: 'looking for agency', category: 'buying', pattern: /\blooking\s+for\s+(?:an?\s+)?(?:\w+\s+){0,4}(?:agency|agencies|development\s+company|development\s+companies)\b/i },
    { label: 'seeking agency partner', category: 'buying', pattern: /\bseeking\s+(?:experienced\s+)?(?:\w+\s+){0,4}(?:agency|agencies|technology\s+partners?)\b/i },
    { label: 'looking for tech partner', category: 'buying', pattern: /\blooking\s+for\s+(?:an?\s+)?(?:\w+\s+){0,5}(?:tech(?:nology)?\s+partner|technical\s+partner|partner|co[- ]?founder)\b/i },
    { label: 'hiring agency', category: 'buying', pattern: /\b(?:hiring|need).{0,60}\b(?:agency|agencies|development\s+company)\b/i },
    { label: 'partner for project', category: 'buying', pattern: /\b(?:looking\s+for|seeking)\s+(?:an?\s+)?(?:\w+\s+){0,4}partner\b/i },
    { label: 'freelance project buyer', category: 'buying', pattern: /\b(?:freelance|project[- ]based).{0,40}\b(?:developer|designer|opportunit)/i },
    { label: 'looking for development companies', category: 'buying', pattern: /\blooking\s+for\b[\s\S]{0,160}\b(?:app\s+development\s+companies|development\s+companies)\b/i },
    { label: 'seeking agency', category: 'buying', pattern: /\bseeking\s+(?:a\s+|an\s+)?(?:seo|marketing|design|creative)\s+agency\b/i },
    { label: 'hiring role for project', category: 'buying', pattern: /\bhiring\s*:\s*(?:a\s+|an\s+)?[\w\s]{2,40}\b/i },
    { label: 'looking to develop website', category: 'buying', pattern: /\blooking\s+to\s+(?:develop|build|create)\s+(?:a\s+|an\s+|our\s+)?(?:professional\s+)?(?:e[- ]?commerce\s+)?(?:website|web\s+app|application|platform)\b/i },
    { label: 'need estimate from developers', category: 'buying', pattern: /\bneed\s+(?:a\s+)?quick\s+estimate\s+from\b/i },
    { label: 'looking for video editor', category: 'buying', pattern: /\blooking\s+for\s+(?:a\s+|an\s+)?(?:creative\s+)?video\s+editor\b/i },
    { label: 'freelance role requirement', category: 'buying', pattern: /\b(?:urgent\s+)?freelance\s+[\w\s/]{2,50}\s+requirement\b/i },
    { label: 'contract role daily rate', category: 'buying', pattern: /\boutside\s+ir35\b/i },
    { label: 'contract booking rate', category: 'buying', pattern: /\b(?:£|\$|€)\s*\d+[\d,.]*\s*(?:per\s+day|\/day|p\/d)\b/i },
    { label: 'share portfolio outreach', category: 'buying', pattern: /\b(?:share|send)\s+(?:me\s+)?(?:your\s+)?portfolio\b/i },
    { label: 'discuss portfolio pricing', category: 'buying', pattern: /\b(?:discuss|share)\s+your\s+(?:experience|portfolio|pricing|examples|previous\s+work)\b/i },
    { label: 'intern or freelancer hire', category: 'buying', pattern: /\b(?:intern|freelancer)\s*\/\s*(?:freelancer|intern)\b/i },
    { label: 'portfolio to email', category: 'buying', pattern: /\bportfolios?\s+to\s+\S+@/i },
    { label: 'estimate and timeline ask', category: 'buying', pattern: /\b(?:development\s+)?cost\s+and\s+timeline\b/i },
    { label: 'comment or dm for work', category: 'buying', pattern: /\b(?:comment\s+below|dm\s+me|drop\s+me\s+a\s+message|reach\s+out)\b/i },

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
    { label: 'hashtag hiring', category: 'employment', pattern: /#hiring\b/i },
    { label: 'hashtag job', category: 'employment', pattern: /#job\b/i },
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
    { label: 'offering services', category: 'non_lead', pattern: /\b(?:available\s+for\s+(?:freelance|contract|projects?)|offering\s+(?:web|app|development|design|marketing)\s+services?)\b/i },
    { label: 'hire our team', category: 'non_lead', pattern: /\b(?:hire\s+(?:us|me|our)|we\s+build\s+(?:websites|apps|products)\s+for)\b/i },
    { label: 'agency pitching', category: 'non_lead', pattern: /\b(?:our\s+agency\s+(?:specializes|helps|builds)|verified\s+freelancers\s+ready\s+to\s+deliver)\b/i },
    { label: 'looking for clients', category: 'non_lead', pattern: /\blooking\s+for\s+(?:clients?|projects?\s+to\s+work\s+on)\b/i },
    { label: 'dm for services', category: 'non_lead', pattern: /\b(?:dm\s+(?:me|us)\s+for|contact\s+us\s+for\s+(?:a\s+)?(?:quote|project))\b/i },
    { label: 'personal social', category: 'non_lead', pattern: /\b(?:can\s+i\s+follow\s+you|happy\s+sunday|where\s+do\s+you\s+live|i\s+love\s+u)\b/i },
    { label: 'open to work', category: 'non_lead', pattern: /\b(?:#opentowork|open\s+to\s+work|available\s+for\s+(?:new\s+)?(?:projects?|work|opportunities))\b/i },
    { label: 'i am a developer', category: 'non_lead', pattern: /\b(?:i\s+am\s+a\s+|i'm\s+a\s+|we\s+are\s+a\s+)(?:freelance\s+)?(?:developer|designer|agency|consultant)\b/i },
    { label: 'aspiring professional', category: 'non_lead', pattern: /\b(?:aspiring|budding)\s+(?:web\s+)?(?:developer|designer|engineer|freelancer)\b/i },
    { label: 'learn in public', category: 'non_lead', pattern: /\b#?(?:learninpublic|buildinpublic|techstudent|deepwork|codinglife|programmerlife|developerhumor)\b/i },
    { label: 'developer humor', category: 'non_lead', pattern: /\b(?:developer\s+humor|coffee\s+driven\s+development|syntax\s+errors|microservices\s+nobody)\b/i },
    { label: 'startup idea pitch', category: 'non_lead', pattern: /\b(?:exploring\s+an\s+idea|not\s+yet\s+a\s+startup|join\s+(?:the\s+)?waitlist|gathering\s+(?:early\s+)?feedback|landing\s+page|product\s+(?:vision|doc|roadmap))\b/i },
    { label: 'side project promo', category: 'non_lead', pattern: /\b(?:built\s+the\s+landing\s+page|spare\s+time|side\s+quest|i\s+work\s+full[- ]time\s+as)\b/i },
    { label: 'personal reflection', category: 'non_lead', pattern: /\b(?:pride\s+myself\s+on|happy\s+sunday|feeling\s+clouded|audit\s+your\s+current\s+projects)\b/i },
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
        if (
            category === 'employment' &&
            hasFreelanceProjectBuyerContext(text) &&
            (label === 'hashtag hiring' || label === 'hashtag job')
        ) {
            continue;
        }
        switch (category) {
            case 'buying': buying.push(label); break;
            case 'recommendation': recommendation.push(label); break;
            case 'employment': employment.push(label); break;
            case 'non_lead': nonLead.push(label); break;
            case 'full_time': fullTime.push(label); break;
        }
    }

    const reasons: string[] = [];
    let confidence = 28;

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
    const isSellerPitch =
        /\bhire\s+(?:us|me|our)\b/i.test(text) ||
        /\b(?:available\s+for\s+(?:freelance|contract|projects?|work)|offering\s+(?:web|app|development|design|marketing)\s+services?)\b/i.test(
            text
        ) ||
        /\b(?:verified\s+freelancers\s+ready\s+to\s+deliver|our\s+agency\s+(?:specializes|helps|builds))\b/i.test(
            text
        );
    const seeksContractorPartner = !isSellerPitch && isBuyerSeekingContractorPartnerAgency(text);
    const freelanceProjectBuyer = !isSellerPitch && hasFreelanceProjectBuyerContext(text);

    if (seeksContractorPartner || freelanceProjectBuyer) {
        confidence = Math.max(confidence, freelanceProjectBuyer && !seeksContractorPartner ? 84 : 86);
        if (!reasons.some((r) => r.includes('freelanc') || r.includes('agency') || r.includes('partner') || r.includes('buying'))) {
            reasons.push(
                seeksContractorPartner
                    ? 'buyer seeking freelancer, agency, or partner'
                    : 'freelance or project-based buyer outreach'
            );
        }
    }

    // Precision: employment posts without buying/recommendation signals → irrelevant
    if (jobSignals >= 1 && serviceSignals === 0 && !seeksContractorPartner && !freelanceProjectBuyer) {
        confidence = Math.min(confidence, 28);
        if (!reasons.some((r) => r.includes('employment') || r.includes('full-time'))) {
            reasons.push('employment signals without service-buying intent');
        }
    }

    if (jobSignals >= 2 && !seeksContractorPartner && !freelanceProjectBuyer) {
        confidence = Math.min(confidence, 18);
        reasons.push('multiple employment signals — treated as job posting');
    }

    // Precision: strong buying without employment → relevant
    if (serviceSignals >= 2 && jobSignals === 0) {
        confidence = Math.max(confidence, 82);
    } else if (serviceSignals >= 1 && jobSignals === 0 && nonLead.length === 0) {
        confidence = Math.max(confidence, 74);
    } else if ((seeksContractorPartner || freelanceProjectBuyer) && serviceSignals >= 1) {
        confidence = Math.max(confidence, 84);
    } else if (freelanceProjectBuyer && serviceSignals === 0) {
        confidence = Math.max(confidence, 80);
    }

    // Mixed: employment + buying — contractor/agency/partner hires are relevant
    if (jobSignals >= 1 && serviceSignals >= 1) {
        if (seeksContractorPartner || freelanceProjectBuyer) {
            confidence = Math.max(confidence, 82);
            reasons.push('hiring hashtag present but buyer seeks freelancer, agency, or partner');
        } else {
            confidence = clamp(confidence, 38, 62);
            reasons.push('mixed employment and buying signals — needs manual review');
        }
    }

    // Sellers pitching services without buying intent
    if (serviceSignals === 0 && nonLead.length >= 1 && jobSignals === 0 && !seeksContractorPartner && !freelanceProjectBuyer) {
        confidence = Math.min(confidence, 22);
    }

    if (
        serviceSignals === 0 &&
        jobSignals === 0 &&
        nonLead.length === 0 &&
        !seeksContractorPartner &&
        !freelanceProjectBuyer
    ) {
        confidence = Math.min(confidence, 22);
    }

    if (isSellerPitch) {
        confidence = Math.min(confidence, 18);
        reasons.push('seller pitch — not a buyer lead');
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

/** Strong buyer signals — model must not downgrade these to noise. */
export function isHardRelevantLead(content: string, intent?: IntentClassification): boolean {
    const classified = intent ?? classifyLeadIntent(content);
    if (isBuyerSeekingContractorPartnerAgency(content) || hasFreelanceProjectBuyerContext(content)) {
        if (/\bhire\s+(?:us|me|our)\b/i.test(content)) return false;
        if (/\b(?:available\s+for|offering)\s+(?:freelance|contract|projects?|work)\b/i.test(content)) {
            return false;
        }
        return classified.confidence >= 71;
    }
    return classified.confidence >= 71;
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
