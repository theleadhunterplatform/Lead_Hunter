import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import * as targetService from '../services/target.service';

export const getTargets = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const targets = await targetService.getAllTargets({
        active: req.query.active as string | undefined,
    });

    res.status(200).json({
        success: true,
        count: targets.length,
        data: targets,
    });
});

export const getTarget = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const target = await targetService.getTargetById(req.params.id as string);

    res.status(200).json({
        success: true,
        data: target,
    });
});

export const addTarget = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const target = await targetService.createTarget(req.body);

    res.status(201).json({
        success: true,
        data: target,
    });
});

export const updateTarget = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const target = await targetService.updateTarget(req.params.id as string, req.body);

    res.status(200).json({
        success: true,
        data: target,
    });
});

export const deleteTarget = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await targetService.deleteTarget(req.params.id as string);

    res.status(200).json({
        success: true,
        data: {},
    });
});

export const scrapeTarget = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await targetService.enqueueTargetScrape(req.params.id as string);

    res.status(202).json({
        success: true,
        message: result.message,
        jobId: result.jobId,
        data: result.target,
    });
});
