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

export function formatEmailStatusLabel(status?: string | null, source?: string | null): string {
    if (isVerifiedEmailStatus(status)) return 'Verified';
    if (status === 'guessed' || source === 'pattern_guess') return 'Guessed';
    if (status === 'unverified' || source === 'apify_profile') return 'Unverified';
    return 'Unknown';
}
