import { classifyLeadIntent, isBuyerSeekingContractorPartnerAgency } from './lead-intent-scoring.utils';

const BUYER_WORDS_IN_KEYWORD =
    /\b(?:looking for|need someone|need help|need a|can anyone|seeking|outsourcing|recommend)\b/i;

const EXPLICIT_BUYER_ASK =
    /\b(?:looking for|need(?: someone| help| a)?|seeking|can anyone recommend|any recommendations|who do you recommend|know anyone who can help)\b/i;

/** Strict gate: only save posts that read like a buyer request in the post text itself. */
export function shouldIngestScrapedPost(
    content: string,
    searchPhrase: string,
    _platform: string
): { ok: boolean; reason?: string } {
    const trimmed = content?.trim() || '';
    if (trimmed.length < 50) {
        return { ok: false, reason: 'post too short' };
    }

    const phrase = searchPhrase.toLowerCase().trim();
    const text = trimmed.toLowerCase();

    // LinkedIn keyword results are already filtered by Apify search — post body often won't repeat the exact query string.
    if (_platform !== 'linkedin' && !phraseInContent(text, phrase)) {
        return { ok: false, reason: 'search phrase not in post text' };
    }

    if (_platform === 'linkedin' && !phraseInContent(text, phrase) && !EXPLICIT_BUYER_ASK.test(text)) {
        return { ok: false, reason: 'no buyer ask in post text' };
    }

    // Bare keywords like "web developer" match seller/student posts — require an explicit buyer ask in the post.
    if (!BUYER_WORDS_IN_KEYWORD.test(phrase) && !EXPLICIT_BUYER_ASK.test(text)) {
        return { ok: false, reason: 'broad keyword — post has no explicit buyer ask' };
    }

    const intent = classifyLeadIntent(trimmed);
    const seeksContractorPartner = isBuyerSeekingContractorPartnerAgency(trimmed);
    const serviceSignals =
        intent.analysis.buying.length + intent.analysis.recommendation.length;
    const jobSignals = intent.analysis.employment.length + intent.analysis.fullTime.length;
    const noiseSignals = intent.analysis.nonLead.length;

    if (serviceSignals === 0 && !seeksContractorPartner) {
        return { ok: false, reason: 'no buyer language in post' };
    }

    if (jobSignals >= 1 && serviceSignals <= 1 && !seeksContractorPartner) {
        return { ok: false, reason: 'employment / job post' };
    }

    if (noiseSignals >= 1 && serviceSignals <= 1 && !seeksContractorPartner) {
        return { ok: false, reason: 'seller or promotional post' };
    }

    if (intent.confidence < 71 && !seeksContractorPartner) {
        return { ok: false, reason: 'buyer intent not strong enough' };
    }

    return { ok: true };
}

function stripArticles(text: string): string {
    return text.replace(/\b(a|an|the)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Require the search phrase (with optional articles / word order) to appear in the post. */
function phraseInContent(text: string, phrase: string): boolean {
    if (!phrase) return false;

    const normalizedText = normalizeForPhraseMatch(text);
    const normalizedPhrase = normalizeForPhraseMatch(phrase);

    if (normalizedText.includes(normalizedPhrase)) return true;

    const strippedText = stripArticles(normalizedText);
    const strippedPhrase = stripArticles(normalizedPhrase);
    if (strippedPhrase && strippedText.includes(strippedPhrase)) return true;

    return phraseWordsInOrder(strippedText, strippedPhrase);
}

function normalizeForPhraseMatch(text: string): string {
    return text
        .replace(/[#@]/g, ' ')
        .replace(/[-/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function phraseWordsInOrder(text: string, phrase: string): boolean {
    const words = phrase.split(' ').filter((word) => word.length > 1);
    if (words.length < 2) return false;

    let searchFrom = 0;
    for (const word of words) {
        const idx = text.indexOf(word, searchFrom);
        if (idx === -1) return false;
        searchFrom = idx + word.length;
    }
    return true;
}
