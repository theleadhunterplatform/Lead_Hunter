import config from '../config';

export type AccountStatus = 'pending' | 'active' | 'rejected';

export function isSignupApprovalRequired(email: string): boolean {
    if (!config.security.requireSignupApproval) {
        return false;
    }

    const normalized = email.toLowerCase().trim();
    if (config.security.platformOwnerEmails.includes(normalized)) {
        return false;
    }

    const defaultAdmin = (process.env.ADMIN_EMAIL || 'admin@leadhunter.com').toLowerCase().trim();
    if (normalized === defaultAdmin) {
        return false;
    }

    return true;
}

export function assertAccountCanAuthenticate(status?: string | null): void {
    if (status === 'pending') {
        throw new Error('ACCOUNT_PENDING_APPROVAL');
    }
    if (status === 'rejected') {
        throw new Error('ACCOUNT_REJECTED');
    }
}
