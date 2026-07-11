import config from '../config';

const INSECURE_SECRETS = new Set(['access_secret', 'refresh_secret', '']);

export function validateProductionConfig(): void {
    if (config.env !== 'production') return;

    const errors: string[] = [];
    const warnings: string[] = [];

    if (INSECURE_SECRETS.has(config.jwt.accessSecret)) {
        errors.push('JWT_ACCESS_SECRET must be set to a strong random value in production');
    }
    if (INSECURE_SECRETS.has(config.jwt.refreshSecret)) {
        errors.push('JWT_REFRESH_SECRET must be set to a strong random value in production');
    }
    if (!config.database.url) {
        errors.push('DATABASE_URL is required in production');
    }
    if (!process.env.FRONTEND_URL?.trim()) {
        errors.push('FRONTEND_URL is required in production (CORS)');
    }

    // Google Sheets OAuth is optional for hunter onboard; Sheets routes return 503 if unset.
    if (
        !config.googleOAuth.clientId.trim() ||
        !config.googleOAuth.clientSecret.trim() ||
        !config.googleOAuth.redirectUri.trim()
    ) {
        warnings.push(
            'Google OAuth is incomplete — Google Sheets export will be unavailable until GOOGLE_OAUTH_* is set'
        );
    }

    if (!config.openRouter.apiKey.trim()) {
        warnings.push(
            'OPEN_ROUTER_API is unset — lead intelligence and outreach drafts will fail until it is set'
        );
    }

    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
        warnings.push(
            'Razorpay is unset — plan upgrades are disabled until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set'
        );
    }

    const settingsKey = config.security.settingsEncryptionKey?.trim();
    if (!settingsKey) {
        errors.push('SETTINGS_ENCRYPTION_KEY is required in production');
    } else {
        try {
            const decoded = Buffer.from(settingsKey, 'base64');
            if (decoded.length !== 32) {
                errors.push('SETTINGS_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
            }
        } catch {
            errors.push('SETTINGS_ENCRYPTION_KEY must be valid base64');
        }
    }

    if (warnings.length) {
        console.warn('⚠ Production configuration warnings:');
        warnings.forEach((w) => console.warn(`  - ${w}`));
    }

    if (errors.length) {
        console.error('✖ Production configuration errors:');
        errors.forEach((e) => console.error(`  - ${e}`));
        throw new Error('Refusing to start with insecure or incomplete production configuration');
    }

    console.log('✔ Production configuration validated');
}
