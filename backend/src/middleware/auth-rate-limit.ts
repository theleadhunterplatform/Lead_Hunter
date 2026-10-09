import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import config from '../config';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.env === 'production' ? 20 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many auth attempts. Try again later.' },
});

// Allow rate limit bypass for internal Next.js proxy ONLY when presenting a verified secret header
export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const internalSecret = process.env.INTERNAL_SERVICE_SECRET;
    const providedSecret = (req.headers['x-internal-secret'] || req.headers['x-service-key']) as string | undefined;

    if (internalSecret && providedSecret) {
        const bufA = Buffer.from(providedSecret, 'utf8');
        const bufB = Buffer.from(internalSecret, 'utf8');
        if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
            return next();
        }
    }

    return limiter(req, res, next);
};
