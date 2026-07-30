export function extractEmailFromText(text: string): string | null {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const match = text.match(emailRegex);
    return match ? match[0].toLowerCase() : null;
}

function normalizePhoneCandidate(raw: string): string | null {
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
    return trimmed;
}

const PHONE_LABEL =
    '(?:phone|ph\\.?|mobile(?:\\s*no\\.?)?|contact|tel(?:ephone)?\\.?|no\\.?|whatsapp|wa|cell|call)';

const PHONE_NUMBER = '(?:\\+?\\(?\\d[\\d\\s\\-.()]{6,}\\d|\\b0\\d[\\d\\s\\-.()]{7,}\\d)';

/** Matches "Phone:", "Mobile No:", "Phone/No/Mobile No/Contact: 0336 ...", etc. */
const LABELED_PHONE_REGEX = new RegExp(
    `${PHONE_LABEL}(?:\\s*[/|,]\\s*${PHONE_LABEL})*\\s*[:\\-]?\\s*(${PHONE_NUMBER})`,
    'gi'
);

const GENERIC_PHONE_REGEX = /(?:\+?\(?\d[\d\s\-.()]{6,}\d|\b0\d[\d\s\-.()]{7,}\d)/g;

export function extractPhoneFromText(text: string): string | null {
    return extractAllPhonesFromText(text)[0] || null;
}

const TEL_HREF_REGEX = /href\s*=\s*["']tel:([^"'>\s]+)/gi;
const WHATSAPP_REGEX = /(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{8,15})/gi;
const JSON_LD_PHONE_REGEX = /"telephone"\s*:\s*"([^"]+)"/gi;
const ITEMPROP_PHONE_REGEX = /itemprop=["']telephone["'][^>]*>([^<]+)</gi;

export function extractAllPhonesFromText(text: string): string[] {
    const withoutEmails = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, ' ');
    const found: string[] = [];
    const seen = new Set<string>();

    const push = (raw: string) => {
        const normalized = normalizePhoneCandidate(raw);
        if (!normalized) return;
        const key = normalized.replace(/\D/g, '');
        if (seen.has(key)) return;
        seen.add(key);
        found.push(normalized);
    };

    for (const match of withoutEmails.matchAll(LABELED_PHONE_REGEX)) {
        push(match[1]);
    }

    const matches = withoutEmails.match(GENERIC_PHONE_REGEX);
    if (matches) {
        for (const match of matches) {
            push(match);
        }
    }

    return found;
}

export function extractAllPhonesFromHtml(html: string): string[] {
    const found: string[] = [];
    const seen = new Set<string>();

    const push = (raw: string) => {
        const normalized = normalizePhoneCandidate(raw.replace(/tel:/i, '').trim());
        if (!normalized) return;
        const key = normalized.replace(/\D/g, '');
        if (seen.has(key)) return;
        seen.add(key);
        found.push(normalized);
    };

    for (const match of html.matchAll(TEL_HREF_REGEX)) {
        push(match[1]);
    }

    for (const match of html.matchAll(WHATSAPP_REGEX)) {
        push(match[1]);
    }

    for (const match of html.matchAll(JSON_LD_PHONE_REGEX)) {
        push(match[1]);
    }

    for (const match of html.matchAll(ITEMPROP_PHONE_REGEX)) {
        push(match[1]);
    }

    return found;
}

export function extractLinkedInPublicId(urls: Array<string | undefined>): string | null {
    for (const url of urls) {
        if (!url) continue;
        const match = url.match(/linkedin\.com\/in\/([^/?#]+)/);
        if (match) return match[1];
    }
    return null;
}

/** LinkedIn internal profile IDs (ACo…) match poorly in Contact Compass / Hunter. */
export function isOpaqueLinkedInPublicId(id: string): boolean {
    return /^ACo[A-Za-z0-9_-]+$/.test(id.trim());
}

/**
 * Prefer vanity slug from scrape (publicIdentifier) over opaque /in/ACo… URLs.
 */
export function resolveLinkedInPublicId(input: {
    author?: { publicIdentifier?: string | null; url?: string | null } | null;
    contact_info?: { linkedin_public_id?: string | null } | null;
    profilePublicId?: string | null;
    urls?: Array<string | undefined | null>;
}): string | null {
    const urlSlug = extractLinkedInPublicId(
        (input.urls?.filter(Boolean) as string[]) ||
            [input.author?.url, ...(input.urls || [])].filter(Boolean) as string[]
    );

    const candidates = [
        input.author?.publicIdentifier,
        input.contact_info?.linkedin_public_id,
        input.profilePublicId,
        urlSlug,
    ]
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean);

    const vanity = candidates.find((id) => !isOpaqueLinkedInPublicId(id));
    return vanity || candidates[0] || null;
}

export function resolveLinkedInPublicIdFromLead(
    lead: { author?: any; contact_info?: any; url?: string; raw_result?: any },
    profilePublicId?: string | null
): string | null {
    const rawAuthor = lead.raw_result?.author;
    return resolveLinkedInPublicId({
        author: {
            ...lead.author,
            publicIdentifier: lead.author?.publicIdentifier || rawAuthor?.publicIdentifier,
            url: lead.author?.url || rawAuthor?.linkedinUrl,
        },
        contact_info: lead.contact_info,
        profilePublicId,
        urls: [lead.author?.url, rawAuthor?.linkedinUrl, lead.url],
    });
}

export type EmailStatus = 'verified' | 'unverified' | 'guessed';

export function isVerifiedEmailStatus(status?: string | null): boolean {
    if (!status) return false;
    const normalized = status.toLowerCase();
    return normalized === 'verified' || normalized === 'valid' || normalized === 'deliverable';
}

/** Terminal contact-enrichment outcomes shown in the pipeline. */
export const ENRICHMENT_CONTACT_FOUND_STATUSES = ['partial', 'found'] as const;

export function hasEnrichmentContactFound(status?: string | null): boolean {
    return status === 'partial' || status === 'found';
}

export function leadHasDiscoverableContact(lead: {
    email?: string | null;
    contact_info?: {
        emails?: Array<{ email?: string }>;
        phone_numbers?: Array<{ number?: string }>;
    } | null;
}): boolean {
    if (lead.email?.trim()) return true;
    if (lead.contact_info?.emails?.some((entry) => entry.email?.trim())) return true;
    if (leadHasPhone(lead)) return true;
    return false;
}

export type PhoneSource =
    | 'post_text'
    | 'apify_profile'
    | 'website'
    | 'author_info'
    | 'google_maps'
    | 'contactout'
    | 'apollo'
    | 'contact_compass'
    | 'threads_profile'
    | 'twitter_profile'
    | 'reddit_profile'
    | 'manual';

export function leadHasPhone(lead: {
    contact_info?: { phone_numbers?: Array<{ number?: string }> } | null;
}): boolean {
    return Boolean(lead.contact_info?.phone_numbers?.some((p) => p.number?.trim()));
}

function normalizePhoneKey(number: string): string {
    return number.replace(/\D/g, '');
}

export function mergePhoneEntry(
    contactInfo: Record<string, any> | null | undefined,
    phone: string,
    source: PhoneSource,
    type: 'mobile' | 'work' | 'direct' = 'mobile'
): Record<string, any> {
    const existing = Array.isArray(contactInfo?.phone_numbers) ? [...contactInfo.phone_numbers] : [];
    const key = normalizePhoneKey(phone);
    const already = existing.some((entry) => normalizePhoneKey(entry.number || '') === key);
    if (!already) {
        existing.unshift({ number: phone, type, source });
    }

    return {
        phone_numbers: existing,
        phone_source: source,
    };
}

export function pickFirstPhone(...candidates: Array<string | null | undefined>): string | null {
    for (const candidate of candidates) {
        if (candidate?.trim()) return candidate.trim();
    }
    return null;
}

export function formatEnrichmentStatusLabel(status?: string | null): string {
    switch (status) {
        case 'found':
            return 'Found (verified)';
        case 'partial':
            return 'Partial (found, not verified)';
        case 'not_found':
            return 'Not found';
        case 'searching':
            return 'Searching';
        case 'pending':
            return 'Pending';
        case 'skipped':
            return 'Skipped';
        case 'failed':
            return 'Failed';
        default:
            return status?.replace(/_/g, ' ') || 'Unknown';
    }
}

/** True when contact enrichment found email or phone (partial or verified). */
export function leadHasContactDetails(lead: {
    enrichment_status?: string | null;
    email?: string | null;
    contact_info?: {
        emails?: Array<{ email?: string }>;
        phone_numbers?: Array<{ number?: string }>;
    } | null;
}): boolean {
    if (!hasEnrichmentContactFound(lead.enrichment_status)) return false;
    return leadHasDiscoverableContact(lead);
}

export function formatEmailStatusLabel(status?: string | null, source?: string | null): string {
    if (isVerifiedEmailStatus(status)) return 'Verified';
    if (status === 'guessed' || source === 'pattern_guess') return 'Guessed';
    if (status === 'unverified' || source === 'apify_profile') return 'Unverified';
    return 'Unknown';
}
