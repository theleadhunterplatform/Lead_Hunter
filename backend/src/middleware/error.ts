import { Request, Response, NextFunction } from 'express';
import ErrorResponse from '../utils/error-response.utils';

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

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
        errors: error.errors || undefined
    });
};

export default errorHandler;
