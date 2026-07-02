import { Request, Response, NextFunction } from 'express';
import config from '../config';
import ErrorResponse from '../utils/error-response.utils';

export const requireExtensionApiKey = (req: Request, _res: Response, next: NextFunction) => {
    const expected = config.security.extensionIngestApiKey;

    if (!expected) {
        if (config.env === 'production') {
            return next(new ErrorResponse('Bulk ingest is disabled. Set EXTENSION_INGEST_API_KEY.', 503));
        }
        return next();
    }

    const provided =
        (req.headers['x-extension-key'] as string) ||
        req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();

    if (!provided || provided !== expected) {
        return next(new ErrorResponse('Invalid extension API key', 401));
    }

    return next();
};
