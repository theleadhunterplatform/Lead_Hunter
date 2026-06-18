import { isVerifiedEmailStatus } from './lead-enrichment.utils';
import { verifyEmailWithHunter } from './hunter-api.utils';
import { verifyEmailDomain, getEmailDomain } from './email-verification.utils';

export type FindSource = 'contact_compass' | 'hunter_finder';

export interface DualVerificationResult {
    email_status: 'verified' | 'unverified' | 'invalid' | 'guessed';
    find_note: string;
    verification_note: string;
    found_by: FindSource[];
    verified_by: string[];
    compass_verified: boolean | null;
    hunter_verified: boolean | null;
    hunter_result?: string;
}

function compassSaysVerified(status?: string | null): boolean {
    return isVerifiedEmailStatus(status);
}

function formatFoundBy(foundBy: FindSource[]): string {
    const labels: Record<FindSource, string> = {
        contact_compass: 'Contact Compass',
        hunter_finder: 'Hunter.io',
    };
    if (foundBy.length === 0) return 'Unknown source';
    if (foundBy.length === 2) return 'Contact Compass and Hunter.io';
    return labels[foundBy[0]];
}

function formatVerifiedBy(verifiedBy: string[]): string {
    if (verifiedBy.length === 0) return 'Not verified';
    if (verifiedBy.length === 2) return 'Contact Compass and Hunter.io';
    return verifiedBy[0];
}

export async function runDualEmailVerification(
    email: string,
    options: {
        source?: string;
        foundBy?: FindSource[];
        compassStatus?: string | null;
        hunterFinderStatus?: string | null;
    } = {}
): Promise<DualVerificationResult> {
    const foundBy = options.foundBy || [];
    const bothFound = foundBy.includes('contact_compass') && foundBy.includes('hunter_finder');

    const compassVerified =
        foundBy.includes('contact_compass') && options.compassStatus != null
            ? compassSaysVerified(options.compassStatus)
            : null;
    const hunterFinderVerified =
        foundBy.includes('hunter_finder') && options.hunterFinderStatus != null
            ? compassSaysVerified(options.hunterFinderStatus)
            : null;

    const hunter = await verifyEmailWithHunter(email);
    const hunterVerifierPass = hunter?.verified === true;
    const hunterResult = hunter?.result;

    const find_note = `Found by ${formatFoundBy(foundBy)}.`;
    const verified_by: string[] = [];

    if (compassVerified) verified_by.push('Contact Compass');
    if (hunterVerifierPass) verified_by.push('Hunter.io');
    else if (hunterFinderVerified) verified_by.push('Hunter.io');

    if (hunterResult && ['undeliverable', 'invalid', 'disposable'].includes(hunterResult)) {
        return {
            email_status: 'invalid',
            find_note,
            verification_note: `Rejected by Hunter.io: ${hunterResult}.`,
            found_by: foundBy,
            verified_by: [],
            compass_verified: compassVerified,
            hunter_verified: false,
            hunter_result: hunterResult,
        };
    }

    if (bothFound && hunterVerifierPass && (compassVerified || compassVerified === null)) {
        return {
            email_status: 'verified',
            find_note,
            verification_note: `Verified by ${formatVerifiedBy(verified_by)}.`,
            found_by: foundBy,
            verified_by,
            compass_verified: compassVerified,
            hunter_verified: true,
            hunter_result: hunterResult,
        };
    }

    if (bothFound && compassVerified && hunterVerifierPass) {
        return {
            email_status: 'verified',
            find_note,
            verification_note: `Verified by Contact Compass and Hunter.io.`,
            found_by: foundBy,
            verified_by,
            compass_verified: true,
            hunter_verified: true,
            hunter_result: hunterResult,
        };
    }

    if (foundBy.length === 1 && foundBy[0] === 'contact_compass') {
        if (hunterVerifierPass) {
            return {
                email_status: 'unverified',
                find_note,
                verification_note: `Found by Contact Compass only. Hunter.io could not find this email, but verified it as ${hunterResult || 'deliverable'}.`,
                found_by: foundBy,
                verified_by: ['Hunter.io'],
                compass_verified: compassVerified,
                hunter_verified: true,
                hunter_result: hunterResult,
            };
        }
        return {
            email_status: 'unverified',
            find_note,
            verification_note: 'Found by Contact Compass only. Hunter.io could not find this email.',
            found_by: foundBy,
            verified_by: compassVerified ? ['Contact Compass'] : [],
            compass_verified: compassVerified,
            hunter_verified: hunterVerifierPass,
            hunter_result: hunterResult,
        };
    }

    if (foundBy.length === 1 && foundBy[0] === 'hunter_finder') {
        if (hunterVerifierPass) {
            return {
                email_status: hunterVerifierPass && compassVerified ? 'verified' : 'unverified',
                find_note,
                verification_note: compassVerified
                    ? `Found by Hunter.io only. Verified by Hunter.io.`
                    : `Found by Hunter.io only. Verified by Hunter.io: ${hunterResult || 'deliverable'}.`,
                found_by: foundBy,
                verified_by: ['Hunter.io'],
                compass_verified: null,
                hunter_verified: true,
                hunter_result: hunterResult,
            };
        }
    }

    if (options.source === 'post_text') {
        return {
            email_status: hunterVerifierPass ? 'verified' : 'unverified',
            find_note: 'Found in post text.',
            verification_note: hunterVerifierPass
                ? `Verified by Hunter.io: ${hunterResult || 'deliverable'}.`
                : 'Found in post text.',
            found_by: [],
            verified_by: hunterVerifierPass ? ['Hunter.io'] : [],
            compass_verified: null,
            hunter_verified: hunterVerifierPass,
            hunter_result: hunterResult,
        };
    }

    if (options.source === 'pattern_guess') {
        return {
            email_status: 'guessed',
            find_note: 'Found by pattern guess.',
            verification_note: hunterResult
                ? `Hunter.io: ${hunterResult}.`
                : 'Guessed work email. Verify before sending.',
            found_by: [],
            verified_by: hunterVerifierPass ? ['Hunter.io'] : [],
            compass_verified: null,
            hunter_verified: hunterVerifierPass,
            hunter_result: hunterResult,
        };
    }

    const domainCheck = await verifyEmailDomain(email);
    if (domainCheck.disposable) {
        return {
            email_status: 'invalid',
            find_note,
            verification_note: 'Disposable email domain rejected.',
            found_by: foundBy,
            verified_by: [],
            compass_verified: compassVerified,
            hunter_verified: hunterVerifierPass,
            hunter_result: hunterResult,
        };
    }

    if (!domainCheck.mx_valid) {
        return {
            email_status: 'invalid',
            find_note,
            verification_note: 'Email domain has no MX records.',
            found_by: foundBy,
            verified_by: [],
            compass_verified: compassVerified,
            hunter_verified: hunterVerifierPass,
            hunter_result: hunterResult,
        };
    }

    return {
        email_status: 'unverified',
        find_note,
        verification_note: `Found by ${formatFoundBy(foundBy)}. Could not fully verify with both tools.`,
        found_by: foundBy,
        verified_by,
        compass_verified: compassVerified,
        hunter_verified: hunterVerifierPass,
        hunter_result: hunterResult,
    };
}

export function getDomainFromEmail(email: string): string | null {
    return getEmailDomain(email);
}
