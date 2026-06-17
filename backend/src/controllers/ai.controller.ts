import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import { trainModel } from '../services/ocr.service';
import { getTrainingSamples as fetchTrainingSamples, getLocalAiMetrics, executeAutoTraining } from '../services/ai-training.service';
import ErrorResponse from '../utils/error-response.utils';

/**
 * @desc    Retrain the AI model with labeled leads from the database
 * @route   POST /api/ai/train
 * @access  Private/Admin
 */
export const triggerTraining = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    console.log('[AI-Controller] Training request received');

    const samples = await fetchTrainingSamples();
    if (samples.length < 10) {
        throw new ErrorResponse(
            `Need at least 10 labeled leads to train. You have ${samples.length}. Mark leads as Relevant/Irrelevant first (use "Use for Training" to prioritize).`,
            400
        );
    }

    const result = await trainModel(samples);

    if (!result.success) {
        return res.status(500).json({
            success: false,
            message: result.message,
            error: result.error,
            samples: samples.length,
        });
    }

    return res.status(200).json({
        success: true,
        message: `AI model retrained on ${samples.length} labeled leads.`,
        samples: samples.length,
        output: result.output,
    });
});

export const getTrainingSamples = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const samples = await fetchTrainingSamples();

    res.status(200).json({
        success: true,
        count: samples.length,
        data: samples,
    });
});

export const getAiMetrics = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const metrics = await getLocalAiMetrics();

    res.status(200).json({
        success: true,
        data: metrics,
    });
});

export const triggerManualTraining = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    await executeAutoTraining();
    const metrics = await getLocalAiMetrics();

    res.status(200).json({
        success: true,
        data: metrics,
    });
});
