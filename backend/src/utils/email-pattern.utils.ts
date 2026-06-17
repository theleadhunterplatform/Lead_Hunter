const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
    'protonmail.com', 'live.com', 'aol.com',
]);

export function extractDomainFromUrl(url: string): string | null {
    try {
        const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return null;
    }
}

export function parsePersonName(fullName?: string): { first: string; last: string } | null {
    if (!fullName?.trim()) return null;
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return null;
    return { first: parts[0], last: parts[parts.length - 1] };
}

export function guessWorkEmails(first: string, last: string, domain: string): string[] {
    const f = first.toLowerCase().replace(/[^a-z]/g, '');
    const l = last.toLowerCase().replace(/[^a-z]/g, '');
    const d = domain.toLowerCase().replace(/^www\./, '');

    if (!f || !l || !d || FREE_EMAIL_DOMAINS.has(d)) return [];

    return [
        `${f}.${l}@${d}`,
        `${f}${l}@${d}`,
        `${f}@${d}`,
        `${f[0]}${l}@${d}`,
        `${f}${l[0]}@${d}`,
        `${f}_${l}@${d}`,
        `${f}-${l}@${d}`,
    ];
}

export function pickBestGuessedEmail(candidates: string[]): string | null {
    const unique = [...new Set(candidates.map((e) => e.toLowerCase()))];
    return unique[0] || null;
}
