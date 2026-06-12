import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import { trainModel } from '../services/ocr.service';

/**
 * @desc    Retrain the AI model with new data
 * @route   POST /api/ai/train
 * @access  Private/Admin
 */
export const triggerTraining = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    console.log('[AI-Controller] Training request received');
    
    const result = await trainModel();

    if (!result.success) {
        return res.status(500).json({
            success: false,
            message: result.message,
            error: result.error
        });
    }

    return res.status(200).json({
        success: true,
        message: 'AI Model successfully retrained and reloaded!',
        output: result.output
    });
});
