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

    if (errors.length) {
        console.error('✖ Production configuration errors:');
        errors.forEach((e) => console.error(`  - ${e}`));
        throw new Error('Refusing to start with insecure or incomplete production configuration');
    }

    console.log('✔ Production configuration validated');
}
