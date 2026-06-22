import { classifyLeadIntent } from './lead-intent-scoring.utils';

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

    if (!phraseInContent(text, phrase)) {
        return { ok: false, reason: 'search phrase not in post text' };
    }

    // Bare keywords like "web developer" match seller/student posts — require an explicit buyer ask in the post.
    if (!BUYER_WORDS_IN_KEYWORD.test(phrase) && !EXPLICIT_BUYER_ASK.test(text)) {
        return { ok: false, reason: 'broad keyword — post has no explicit buyer ask' };
    }

    const intent = classifyLeadIntent(trimmed);
    const serviceSignals =
        intent.analysis.buying.length + intent.analysis.recommendation.length;
    const jobSignals = intent.analysis.employment.length + intent.analysis.fullTime.length;
    const noiseSignals = intent.analysis.nonLead.length;

    if (serviceSignals === 0) {
        return { ok: false, reason: 'no buyer language in post' };
    }

    if (jobSignals >= 1 && serviceSignals <= 1) {
        return { ok: false, reason: 'employment / job post' };
    }

    if (noiseSignals >= 1 && serviceSignals <= 1) {
        return { ok: false, reason: 'seller or promotional post' };
    }

    if (intent.confidence < 71) {
        return { ok: false, reason: 'buyer intent not strong enough' };
    }

    return { ok: true };
}

function stripArticles(text: string): string {
    return text.replace(/\b(a|an|the)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Require the search phrase (with optional articles) to appear in the post. */
function phraseInContent(text: string, phrase: string): boolean {
    if (!phrase) return false;

    const normalizedText = text.replace(/\s+/g, ' ');
    const normalizedPhrase = phrase.replace(/\s+/g, ' ');

    if (normalizedText.includes(normalizedPhrase)) return true;

    const strippedText = stripArticles(normalizedText);
    const strippedPhrase = stripArticles(normalizedPhrase);
    if (strippedPhrase && strippedText.includes(strippedPhrase)) return true;

    return false;
}
