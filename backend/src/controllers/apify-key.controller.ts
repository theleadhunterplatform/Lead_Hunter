import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import * as apifyKeyService from '../services/apify-key.service';
import { getApifyCommentUsageView, getApifyPlatformUsage } from '../utils/apify-usage.utils';

// @desc    Get all Apify keys
// @route   GET /api/apify-keys
// @access  Private
export const getApifyKeys = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const keys = await apifyKeyService.getAllApifyKeys();

    const data = await Promise.all(
        keys.map(async (key: Record<string, any>) => {
            const commentUsage = getApifyCommentUsageView(key);
            const platformUsage =
                key.is_active && typeof key.key === 'string'
                    ? await getApifyPlatformUsage(key.key)
                    : null;

            return {
                ...key,
                usage: commentUsage,
                platform_usage: platformUsage,
            };
        })
    );

    res.status(200).json({
        success: true,
        count: data.length,
        data,
    });
});

// @desc    Get single Apify key
// @route   GET /api/apify-keys/:id
// @access  Private
export const getApifyKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const key = await apifyKeyService.getApifyKeyById(req.params.id as string);

    res.status(200).json({
        success: true,
        data: key
    });
});

// @desc    Add Apify key
// @route   POST /api/apify-keys
// @access  Private
export const addApifyKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const apifyKey = await apifyKeyService.addApifyKey(req.body);

    res.status(201).json({
        success: true,
        data: apifyKey
    });
});

// @desc    Update Apify key
// @route   PUT /api/apify-keys/:id
// @access  Private
export const updateApifyKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const key = await apifyKeyService.updateApifyKey(req.params.id as string, req.body);

    res.status(200).json({
        success: true,
        data: key
    });
});

// @desc    Delete Apify key (Soft Delete)
// @route   DELETE /api/apify-keys/:id
// @access  Private
export const deleteApifyKey = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await apifyKeyService.deleteApifyKey(req.params.id as string);

    res.status(200).json({
        success: true,
        data: {}
    });
});
