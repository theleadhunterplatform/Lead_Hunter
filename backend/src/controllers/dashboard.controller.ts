import { NextFunction, Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import { getDashboardStats, getLeadStats } from '../services/dashboard.service';
import { getScrapeActivityStats } from '../utils/scrape-run-log.utils';
import { getUserPermissions, hasPermission as checkPermission } from '../utils/rbac.utils';
import ErrorResponse from '../utils/error-response.utils';

export const getStats = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const stats = await getDashboardStats(req.user);

    res.status(200).json({
        success: true,
        data: stats,
    });
});

export const getLeadIntelligenceStats = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    if (!req.user?.id) {
        throw new ErrorResponse('Not authorized', 401);
    }

    const permissions = await getUserPermissions(
        req.user.id,
        req.user.organization?.toString()
    );
    const isInternal =
        checkPermission(permissions, '*') || checkPermission(permissions, 'system:admin');

    if (!isInternal) {
        throw new ErrorResponse('Not authorized to view lead intelligence stats.', 403);
    }

    const stats = await getLeadStats();
    const scrape = await getScrapeActivityStats();

    res.status(200).json({
        success: true,
        data: {
            ...stats,
            scrape,
        },
    });
});
