import { isVerifiedEmailStatus } from './lead-enrichment.utils';
import type { FindSource } from './dual-email-verification.utils';

export interface LeadEmailEntry {
    email: string;
    found_by: FindSource[];
    email_status: string;
    email_source: string;
    find_note: string;
    verification_note: string;
    verified_by: string[];
    is_primary?: boolean;
}

export function formatFoundByList(foundBy: string[]): string {
    return foundBy
        .map((s) =>
            s === 'contact_compass' ? 'Contact Compass' : s === 'hunter_finder' ? 'Hunter.io' : s
        )
        .join(' + ');
}

export function pickPrimaryEmailEntry(entries: LeadEmailEntry[]): LeadEmailEntry {
    const ranked = [...entries].sort((a, b) => scoreEntry(b) - scoreEntry(a));
    return ranked[0];
}

function scoreEntry(entry: LeadEmailEntry): number {
    let score = 0;
    if (isVerifiedEmailStatus(entry.email_status)) score += 100;
    if (entry.found_by.length >= 2) score += 50;
    if (entry.found_by.includes('contact_compass')) score += 20;
    if (entry.found_by.includes('hunter_finder')) score += 20;
    return score;
}

export function buildEmailEntry(
    email: string,
    verification: {
        found_by: FindSource[];
        email_status: string;
        find_note: string;
        verification_note: string;
        verified_by: string[];
    },
    emailSource: string
): LeadEmailEntry {
    return {
        email,
        found_by: verification.found_by,
        email_status: verification.email_status,
        email_source: emailSource,
        find_note: verification.find_note,
        verification_note: verification.verification_note,
        verified_by: verification.verified_by,
    };
}
