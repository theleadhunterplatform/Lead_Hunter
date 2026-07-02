import rateLimit from 'express-rate-limit';
import config from '../config';

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.env === 'production' ? 20 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many auth attempts. Try again later.' },
});
