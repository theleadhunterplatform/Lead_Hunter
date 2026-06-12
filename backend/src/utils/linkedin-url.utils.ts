export const normalizeLinkedInUrl = (url: string): string => {
    let normalized = url.trim();
    if (!normalized.startsWith('http')) {
        normalized = `https://${normalized}`;
    }
    try {
        const parsed = new URL(normalized);
        if (!parsed.hostname.includes('linkedin.com')) {
            throw new Error('Not a LinkedIn URL');
        }
        parsed.hash = '';
        parsed.search = '';
        return parsed.toString().replace(/\/$/, '');
    } catch {
        throw new Error('Invalid LinkedIn URL');
    }
};

export const isValidLinkedInProfileUrl = (url: string): boolean => {
    try {
        const normalized = normalizeLinkedInUrl(url);
        return /linkedin\.com\/(in|company)\/[^/?#]+/i.test(normalized);
    } catch {
        return false;
    }
};
