import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error-response.utils';
import config from '../config';

const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
    let error = { ...err };
    error.message = err.message;

    // Log to console for dev
    console.error(err);

    if (err.code === 'P2025') {
        error = new ErrorResponse('Resource not found', 404);
    }

    if (err.code === 'P2002') {
        error = new ErrorResponse('Duplicate field value entered', 400);
    }

    const statusCode = error.statusCode || 500;
    const isProd = config.env === 'production';
    const safeMessage =
        isProd && statusCode >= 500
            ? 'Internal Server Error'
            : error.message || 'Server Error';

    res.status(statusCode).json({
        success: false,
        error: safeMessage,
        errors: isProd && statusCode >= 500 ? undefined : error.errors || undefined
    });
};

export default errorHandler;
