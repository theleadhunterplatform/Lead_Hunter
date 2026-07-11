import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import * as planService from '../services/plan.service';
import ErrorResponse from '../utils/error-response.utils';

export const listPlans = asyncHandler(async (_req: Request, res: Response) => {
    return res.status(200).json({
        success: true,
        data: planService.getAvailablePlans(),
    });
});

export const getMyPlan = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const data = await planService.getMyPlanStatus((user._id || user.id).toString());
    return res.status(200).json({ success: true, data });
});

export const adminSetUserPlan = asyncHandler(async (req: Request, res: Response) => {
    const actor = req.user as any;
    const plan = req.body?.plan;
    if (!plan) throw new ErrorResponse('plan is required', 400);

    const data = await planService.setUserPlan(req.params.id as string, plan, {
        refill_tokens: req.body?.refill_tokens !== false,
        actorId: (actor._id || actor.id).toString(),
    });

    return res.status(200).json({
        success: true,
        data,
        message: `User plan updated to ${data.plan_name}.`,
    });
});

export const adminGrantTokens = asyncHandler(async (req: Request, res: Response) => {
    const actor = req.user as any;
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount === 0) {
        throw new ErrorResponse('amount must be a non-zero number', 400);
    }

    const data = await planService.grantUserTokens(
        req.params.id as string,
        amount,
        (actor._id || actor.id).toString()
    );

    return res.status(200).json({
        success: true,
        data,
        message: `Granted ${data.granted} tokens.`,
    });
});
