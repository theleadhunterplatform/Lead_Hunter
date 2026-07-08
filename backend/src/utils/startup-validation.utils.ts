import config from '../config';

const INSECURE_SECRETS = new Set(['access_secret', 'refresh_secret', '']);

export function validateProductionConfig(): void {
    if (config.env !== 'production') return;

    const errors: string[] = [];

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
    if (!config.googleOAuth.clientId.trim()) {
        errors.push('GOOGLE_OAUTH_CLIENT_ID is required in production');
    }
    if (!config.googleOAuth.clientSecret.trim()) {
        errors.push('GOOGLE_OAUTH_CLIENT_SECRET is required in production');
    }
    if (!config.googleOAuth.redirectUri.trim()) {
        errors.push('GOOGLE_OAUTH_REDIRECT_URI is required in production');
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

    if (errors.length) {
        console.error('✖ Production configuration errors:');
        errors.forEach((e) => console.error(`  - ${e}`));
        throw new Error('Refusing to start with insecure or incomplete production configuration');
    }

    console.log('✔ Production configuration validated');
}
