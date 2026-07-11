import prisma from '../lib/prisma';
import User from '../models/user.model';
import ErrorResponse from '../utils/error-response.utils';
import * as settingService from './setting.service';
import {
    PlanId,
    currentPlanMonth,
    getPlanDefinition,
    isPlanId,
    listPlanDefinitions,
} from '../utils/plan.utils';

type UserPlanState = {
    refill_month: string;
    claims_this_month: number;
};

function planStateKey(userId: string): string {
    return `user_plan_state_${userId}`;
}

async function getPlanState(userId: string): Promise<UserPlanState> {
    const month = currentPlanMonth();
    const raw = await settingService.getSetting(planStateKey(userId));
    if (raw && typeof raw === 'object') {
        const state = raw as Partial<UserPlanState>;
        if (state.refill_month === month) {
            return {
                refill_month: month,
                claims_this_month: Number(state.claims_this_month) || 0,
            };
        }
    }
    return { refill_month: month, claims_this_month: 0 };
}

async function savePlanState(userId: string, state: UserPlanState): Promise<void> {
    await settingService.updateSetting(planStateKey(userId), state, 'User plan monthly usage state');
}

export function getAvailablePlans() {
    return listPlanDefinitions();
}

/**
 * Refill tokens at the start of each calendar month (sets balance to plan allotment).
 */
export async function ensureMonthlyTokenRefill(userId: string): Promise<{
    refilled: boolean;
    tokens: number;
    plan: string;
    claims_this_month: number;
}> {
    const user = await User.findById(userId);
    if (!user) throw new ErrorResponse('User not found', 404);

    const plan = getPlanDefinition(user.plan);
    const month = currentPlanMonth();
    const state = await getPlanState(userId);
    const userIdStr = (user._id || user.id).toString();

    if (state.refill_month !== month) {
        await prisma.user.update({
            where: { id: userIdStr },
            data: { tokens: plan.monthly_tokens },
        });
        await savePlanState(userIdStr, { refill_month: month, claims_this_month: 0 });
        return {
            refilled: true,
            tokens: plan.monthly_tokens,
            plan: plan.id,
            claims_this_month: 0,
        };
    }

    return {
        refilled: false,
        tokens: user.tokens,
        plan: plan.id,
        claims_this_month: state.claims_this_month,
    };
}

export async function getMyPlanStatus(userId: string) {
    const refill = await ensureMonthlyTokenRefill(userId);
    const user = await User.findById(userId);
    if (!user) throw new ErrorResponse('User not found', 404);

    const plan = getPlanDefinition(user.plan);
    const state = await getPlanState(userId);

    return {
        plan: plan.id,
        plan_name: plan.name,
        description: plan.description,
        features: plan.features,
        tokens: user.tokens,
        monthly_tokens: plan.monthly_tokens,
        claim_cost: plan.claim_cost,
        max_claims_per_month: plan.max_claims_per_month,
        claims_this_month: state.claims_this_month,
        claims_remaining_this_month:
            plan.max_claims_per_month < 0
                ? null
                : Math.max(0, plan.max_claims_per_month - state.claims_this_month),
        refill_month: state.refill_month,
        refilled_this_request: refill.refilled,
    };
}

export async function assertCanClaimLead(userId: string, options?: { isInternal?: boolean }) {
    const refill = await ensureMonthlyTokenRefill(userId);
    const user = await User.findById(userId);
    if (!user) throw new ErrorResponse('User not found', 404);

    const plan = getPlanDefinition(user.plan);
    const state = await getPlanState(userId);
    const isInternal = options?.isInternal === true;
    const tokenCost = isInternal ? 0 : plan.claim_cost;

    if (
        !isInternal
        && plan.max_claims_per_month >= 0
        && state.claims_this_month >= plan.max_claims_per_month
    ) {
        throw new ErrorResponse(
            `Monthly claim limit reached for ${plan.name} plan (${plan.max_claims_per_month}/month). Upgrade your plan or wait for next month.`,
            403
        );
    }

    if (!isInternal && user.tokens < tokenCost) {
        throw new ErrorResponse(
            `Insufficient tokens to claim this lead. Need ${tokenCost}, have ${user.tokens}.`,
            403
        );
    }

    return {
        user,
        plan,
        tokenCost,
        claims_this_month: state.claims_this_month,
        tokens: refill.refilled ? plan.monthly_tokens : user.tokens,
    };
}

export async function recordSuccessfulClaim(userId: string, tokenCost: number): Promise<number> {
    const userIdStr = userId.toString();
    const state = await getPlanState(userIdStr);

    let remaining = 0;
    if (tokenCost > 0) {
        const updated = await prisma.user.update({
            where: { id: userIdStr },
            data: { tokens: { decrement: tokenCost } },
        });
        remaining = updated.tokens;
    } else {
        const user = await prisma.user.findUnique({ where: { id: userIdStr } });
        remaining = user?.tokens ?? 0;
    }

    await savePlanState(userIdStr, {
        refill_month: currentPlanMonth(),
        claims_this_month: state.claims_this_month + 1,
    });

    return remaining;
}

export async function setUserPlan(
    userId: string,
    planId: string,
    options?: { refill_tokens?: boolean; actorId?: string }
) {
    if (!isPlanId(planId)) {
        throw new ErrorResponse('Invalid plan. Use free, paid, or enterprise.', 400);
    }

    const plan = getPlanDefinition(planId);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing || existing.is_deleted) {
        throw new ErrorResponse('User not found', 404);
    }

    const data: { plan: PlanId; tokens?: number } = { plan: planId };
    if (options?.refill_tokens !== false) {
        data.tokens = plan.monthly_tokens;
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data,
    });

    await savePlanState(userId, {
        refill_month: currentPlanMonth(),
        claims_this_month: 0,
    });

    if (options?.actorId) {
        await prisma.auditLog.create({
            data: {
                actorId: options.actorId,
                action: 'user.plan.update',
                resource: 'user',
                resourceId: userId,
                status: 'success',
                details: {
                    plan: planId,
                    tokens: updated.tokens,
                    email: updated.email,
                },
            },
        });
    }

    return {
        id: updated.id,
        email: updated.email,
        plan: updated.plan,
        tokens: updated.tokens,
        plan_name: plan.name,
        monthly_tokens: plan.monthly_tokens,
        claim_cost: plan.claim_cost,
        max_claims_per_month: plan.max_claims_per_month,
    };
}

export async function grantUserTokens(userId: string, amount: number, actorId?: string) {
    if (!Number.isFinite(amount) || amount === 0) {
        throw new ErrorResponse('amount must be a non-zero number', 400);
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing || existing.is_deleted) {
        throw new ErrorResponse('User not found', 404);
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { tokens: { increment: Math.trunc(amount) } },
    });

    if (actorId) {
        await prisma.auditLog.create({
            data: {
                actorId,
                action: 'user.tokens.grant',
                resource: 'user',
                resourceId: userId,
                status: 'success',
                details: { amount: Math.trunc(amount), tokens: updated.tokens },
            },
        });
    }

    return {
        id: updated.id,
        email: updated.email,
        tokens: updated.tokens,
        granted: Math.trunc(amount),
    };
}
