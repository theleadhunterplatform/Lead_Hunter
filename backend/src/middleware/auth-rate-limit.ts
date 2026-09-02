import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import config from '../config';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.env === 'production' ? 20 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many auth attempts. Try again later.' },
});

// Skip rate limiting for the internal service account used by the Next.js proxy
export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as { email?: string };
    const serviceEmail = process.env.EXTERNAL_API_EMAIL || 'admin@leadhunter.com';
    if (body?.email && body.email.toLowerCase() === serviceEmail.toLowerCase()) {
        return next();
    }
    return limiter(req, res, next);
};
