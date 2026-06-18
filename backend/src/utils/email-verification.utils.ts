import dns from 'dns/promises';
import { verifyEmailWithHunter } from './hunter-api.utils';

const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'yopmail.com',
]);

export function getEmailDomain(email: string): string | null {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : null;
}

export async function hasMxRecord(domain: string): Promise<boolean> {
    try {
        const records = await dns.resolveMx(domain);
        return records.length > 0;
    } catch {
        return false;
    }
}

export async function verifyEmailDomain(email: string): Promise<{
    domain: string;
    mx_valid: boolean;
    disposable: boolean;
}> {
    const domain = getEmailDomain(email);
    if (!domain) {
        return { domain: '', mx_valid: false, disposable: false };
    }

    const mx_valid = await hasMxRecord(domain);
    return {
        domain,
        mx_valid,
        disposable: DISPOSABLE_DOMAINS.has(domain),
    };
}

const SOURCE_LABELS: Record<string, string> = {
    post_text: 'Found in post text',
    contact_compass: 'Contact Compass',
    apify_profile: 'LinkedIn profile',
    threads_profile: 'Threads profile',
    pattern_guess: 'Work email pattern',
};

export async function runEmailVerification(
    email: string,
    _currentStatus: string,
    source: string
): Promise<{ email_status: string; verification_note?: string }> {
    if (source === 'post_text') {
        return { email_status: 'verified', verification_note: SOURCE_LABELS.post_text };
    }

    const hunter = await verifyEmailWithHunter(email);
    if (hunter?.verified) {
        return { email_status: 'verified', verification_note: `Hunter.io: ${hunter.result}` };
    }
    if (hunter?.result && ['undeliverable', 'invalid', 'disposable'].includes(hunter.result)) {
        return { email_status: 'invalid', verification_note: `Hunter.io: ${hunter.result}` };
    }

    const domainCheck = await verifyEmailDomain(email);
    if (domainCheck.disposable) {
        return { email_status: 'invalid', verification_note: 'Disposable email domain rejected.' };
    }

    if (!domainCheck.mx_valid) {
        return { email_status: 'invalid', verification_note: 'Email domain has no MX records.' };
    }

    const label = SOURCE_LABELS[source] || 'Automated enrichment';
    return {
        email_status: 'verified',
        verification_note: `Auto-verified via ${label}.`,
    };
}
