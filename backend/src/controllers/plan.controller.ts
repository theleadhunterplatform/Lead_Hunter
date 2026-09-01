import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import * as planService from '../services/plan.service';
import ErrorResponse from '../utils/error-response.utils';
import prisma from '../lib/prisma';

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

// Dedicated credits endpoint — returns just the token/credit balance
// Used by Yash's frontend to display credits
export const getMyCredits = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const userId = (user._id || user.id).toString();
    const data = await planService.getMyPlanStatus(userId);
    return res.status(200).json({
        success: true,
        data: {
            tokens: data.tokens,
            monthly_tokens: data.monthly_tokens,
            claim_cost: data.claim_cost,
            claims_this_month: data.claims_this_month,
            claims_remaining: data.claims_remaining_this_month,
            plan: data.plan,
            plan_name: data.plan_name,
            refill_month: data.refill_month,
        },
    });
});

// Cancel subscription — downgrades user to free plan
export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const userId = (user._id || user.id).toString();

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) throw new ErrorResponse('User not found', 404);

    if (currentUser.plan === 'free') {
        return res.status(400).json({
            success: false,
            error: 'You are already on the free plan.',
        });
    }

    const data = await planService.setUserPlan(userId, 'free', {
        refill_tokens: false, // Keep remaining tokens, don't reset
        actorId: userId,
    });

    await prisma.auditLog.create({
        data: {
            actorId: userId,
            action: 'user.subscription.cancel',
            resource: 'user',
            resourceId: userId,
            status: 'success',
            details: { previous_plan: currentUser.plan, new_plan: 'free' },
        },
    });

    return res.status(200).json({
        success: true,
        data,
        message: 'Subscription cancelled. You have been moved to the free plan.',
    });
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
