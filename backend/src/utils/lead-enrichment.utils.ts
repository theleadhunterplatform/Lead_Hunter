import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function extractEmailFromText(text: string): string | null {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const match = text.match(emailRegex);
    return match ? match[0].toLowerCase() : null;
}

export function extractPhoneFromText(text: string): string | null {
    const phoneRegex = /(\+?\d[\d\s\-\(\)]{7,}\d)/g;
    const matches = text.match(phoneRegex);
    if (!matches) return null;

    for (const match of matches) {
        const phoneNumber = parsePhoneNumberFromString(match);
        if (phoneNumber?.isValid()) {
            return phoneNumber.formatInternational();
        }
    }
    return null;
}

export function extractLinkedInPublicId(urls: Array<string | undefined>): string | null {
    for (const url of urls) {
        if (!url) continue;
        const match = url.match(/linkedin\.com\/in\/([^/?#]+)/);
        if (match) return match[1];
    }
    return null;
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
    if (lead.contact_info?.phone_numbers?.some((p) => p.number?.trim())) return true;
    return false;
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
