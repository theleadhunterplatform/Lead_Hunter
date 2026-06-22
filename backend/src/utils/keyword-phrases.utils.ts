const PHRASE_SPLIT =
    /(?=\b(?:looking for|need someone|need help|need a|can anyone|seeking|outsourcing)\b)/i;

const MAX_KEYWORD_LENGTH = 120;

/** Split pasted blocks into individual search phrases (one per line or repeated starters). */
export function splitKeywordPhrases(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    const lines = trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length > 1) {
        return [...new Set(lines.filter((line) => line.length <= MAX_KEYWORD_LENGTH))];
    }

    const block = lines[0] || trimmed;
    const starterMatches = block.match(
        /\b(?:looking for|need someone|need help|need a|can anyone|seeking|outsourcing)\b/gi
    );
    const hasMultiplePhrases = (starterMatches?.length || 0) > 1;

    if (block.length <= MAX_KEYWORD_LENGTH && !hasMultiplePhrases) {
        return [block];
    }

    const parts = block
        .split(PHRASE_SPLIT)
        .map((part) => part.trim())
        .filter((part) => part.length >= 12 && part.length <= MAX_KEYWORD_LENGTH);

    if (parts.length > 1) {
        return [...new Set(parts)];
    }

    return [block.slice(0, MAX_KEYWORD_LENGTH).trim()];
}

export function normalizeKeywordInput(texts: string[]): string[] {
    const out: string[] = [];
    for (const text of texts) {
        out.push(...splitKeywordPhrases(text));
    }
    return [...new Set(out.map((p) => p.replace(/\s+/g, ' ').trim()))].filter(Boolean);
}
