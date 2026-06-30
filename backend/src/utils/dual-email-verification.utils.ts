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

export function formatVerifiedByLabel(verifiedBy: string[]): string | null {
    if (!verifiedBy.length) return null;

    const hasCompass = verifiedBy.includes('Contact Compass');
    const hasHunter = verifiedBy.includes('Hunter.io');

    if (hasCompass && hasHunter) return 'Verified by: Contact Compass & Hunter.io';
    if (hasCompass) return 'Verified by: Contact Compass Only';
    if (hasHunter) return 'Verified by: Hunter.io Only';
    return null;
}

function bothToolsConfirmed(compassVerified: boolean | null, hunterVerified: boolean): boolean {
    return compassVerified === true && hunterVerified;
}

function buildResult(
    partial: Omit<DualVerificationResult, 'verification_note'> & { verification_note?: string }
): DualVerificationResult {
    const label = formatVerifiedByLabel(partial.verified_by);
    const verification_note =
        partial.verification_note ||
        label ||
        (partial.email_status === 'verified'
            ? 'Verified by: Contact Compass & Hunter.io'
            : `Found by ${formatFoundBy(partial.found_by)}.`);

    return {
        ...partial,
        verification_note,
    } as DualVerificationResult;
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
    const includesCompass = foundBy.includes('contact_compass');

    const compassVerified =
        includesCompass && options.compassStatus != null
            ? compassSaysVerified(options.compassStatus)
            : includesCompass
              ? false
              : null;
    const hunterFinderVerified =
        foundBy.includes('hunter_finder') && options.hunterFinderStatus != null
            ? compassSaysVerified(options.hunterFinderStatus)
            : null;

    const hunter = await verifyEmailWithHunter(email);
    const hunterVerifierPass = hunter?.verified === true;
    const hunterResult = hunter?.result;

    const find_note = foundBy.length
        ? `Found by ${formatFoundBy(foundBy)}.`
        : '';

    if (hunterResult && ['undeliverable', 'invalid', 'disposable'].includes(hunterResult)) {
        if (includesCompass) {
            return buildResult({
                email_status: 'unverified',
                find_note,
                verification_note: `Found by Contact Compass. Hunter.io marked as ${hunterResult}; kept as unverified for review.`,
                found_by: foundBy,
                verified_by: compassVerified ? ['Contact Compass'] : [],
                compass_verified: compassVerified,
                hunter_verified: false,
                hunter_result: hunterResult,
            });
        }
        return buildResult({
            email_status: 'invalid',
            find_note,
            verification_note: `Rejected by Hunter.io: ${hunterResult}.`,
            found_by: foundBy,
            verified_by: [],
            compass_verified: compassVerified,
            hunter_verified: false,
            hunter_result: hunterResult,
        });
    }

    if (bothToolsConfirmed(compassVerified, hunterVerifierPass) && includesCompass) {
        return buildResult({
            email_status: 'verified',
            find_note,
            found_by: foundBy,
            verified_by: ['Contact Compass', 'Hunter.io'],
            compass_verified: true,
            hunter_verified: true,
            hunter_result: hunterResult,
        });
    }

    if (foundBy.length === 1 && foundBy[0] === 'contact_compass') {
        if (hunterVerifierPass && !compassVerified) {
            return buildResult({
                email_status: 'unverified',
                find_note,
                verification_note: `Found by Contact Compass only. Hunter.io verified as ${hunterResult || 'deliverable'}, but Contact Compass did not confirm.`,
                found_by: foundBy,
                verified_by: ['Hunter.io'],
                compass_verified: compassVerified,
                hunter_verified: true,
                hunter_result: hunterResult,
            });
        }
        return buildResult({
            email_status: 'unverified',
            find_note,
            verification_note: 'Found by Contact Compass only. Hunter.io could not find this email.',
            found_by: foundBy,
            verified_by: compassVerified ? ['Contact Compass'] : [],
            compass_verified: compassVerified,
            hunter_verified: false,
            hunter_result: hunterResult,
        });
    }

    if (foundBy.length === 1 && foundBy[0] === 'hunter_finder') {
        if (hunterVerifierPass) {
            return buildResult({
                email_status: 'unverified',
                find_note,
                found_by: foundBy,
                verified_by: ['Hunter.io'],
                compass_verified: null,
                hunter_verified: true,
                hunter_result: hunterResult,
            });
        }
    }

    if (options.source === 'post_text') {
        return buildResult({
            email_status: hunterVerifierPass ? 'unverified' : 'unverified',
            find_note: 'Found in post text.',
            verification_note: hunterVerifierPass
                ? `Verified by: Hunter.io Only`
                : 'Found in post text.',
            found_by: [],
            verified_by: hunterVerifierPass ? ['Hunter.io'] : [],
            compass_verified: null,
            hunter_verified: hunterVerifierPass,
            hunter_result: hunterResult,
        });
    }

    if (options.source === 'pattern_guess') {
        return buildResult({
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
        });
    }

    const domainCheck = await verifyEmailDomain(email);
    if (domainCheck.disposable) {
        return buildResult({
            email_status: 'invalid',
            find_note,
            verification_note: 'Disposable email domain rejected.',
            found_by: foundBy,
            verified_by: [],
            compass_verified: compassVerified,
            hunter_verified: hunterVerifierPass,
            hunter_result: hunterResult,
        });
    }

    if (!domainCheck.mx_valid) {
        return buildResult({
            email_status: 'invalid',
            find_note,
            verification_note: 'Email domain has no MX records.',
            found_by: foundBy,
            verified_by: [],
            compass_verified: compassVerified,
            hunter_verified: hunterVerifierPass,
            hunter_result: hunterResult,
        });
    }

    const verified_by: string[] = [];
    if (compassVerified) verified_by.push('Contact Compass');
    if (hunterVerifierPass) verified_by.push('Hunter.io');
    else if (hunterFinderVerified) verified_by.push('Hunter.io');

    return buildResult({
        email_status: 'unverified',
        find_note: find_note || `Found by ${formatFoundBy(foundBy)}.`,
        verification_note: 'Could not fully verify with both Contact Compass and Hunter.io.',
        found_by: foundBy,
        verified_by,
        compass_verified: compassVerified,
        hunter_verified: hunterVerifierPass,
        hunter_result: hunterResult,
    });
}

export function getDomainFromEmail(email: string): string | null {
    return getEmailDomain(email);
}
