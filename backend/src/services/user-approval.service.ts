import prisma from '../lib/prisma';
import User from '../models/user.model';
import ErrorResponse from '../utils/error-response.utils';
import { toApiDoc } from '../utils/serialize.utils';
import { setUserPlan } from './plan.service';

function formatPendingUser(user: {
    id: string;
    name: string;
    email: string;
    status: string;
    plan: string;
    createdAt: Date;
    organization?: { id: string; name: string } | null;
}) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        plan: user.plan,
        created_at: user.createdAt,
        organization: user.organization
            ? { id: user.organization.id, name: user.organization.name }
            : null,
    };
}

export async function listPendingSignupUsers() {
    const users = await prisma.user.findMany({
        where: {
            status: 'pending',
            is_deleted: false,
        },
        include: { organization: true },
        orderBy: { createdAt: 'desc' },
    });

    return users.map(formatPendingUser);
}

export async function approveSignupUser(userId: string, actorId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.is_deleted) {
        throw new ErrorResponse('User not found', 404);
    }
    if (user.status !== 'pending') {
        throw new ErrorResponse(`User is not pending approval (current status: ${user.status})`, 400);
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            status: 'active',
            is_active: true,
            lead_access_enabled: true,
        },
        include: { organization: true },
    });

    await setUserPlan(userId, (updated.plan as string) || 'free', {
        refill_tokens: true,
        actorId,
    });

    await prisma.auditLog.create({
        data: {
            actorId,
            action: 'user.signup.approve',
            resource: 'user',
            resourceId: userId,
            status: 'success',
            details: { email: updated.email, plan: updated.plan || 'free' },
        },
    });

    return formatPendingUser(updated);
}

export async function rejectSignupUser(userId: string, actorId: string, reason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.is_deleted) {
        throw new ErrorResponse('User not found', 404);
    }
    if (user.status !== 'pending') {
        throw new ErrorResponse(`User is not pending approval (current status: ${user.status})`, 400);
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            status: 'rejected',
            is_active: false,
            lead_access_enabled: false,
        },
        include: { organization: true },
    });

    await prisma.auditLog.create({
        data: {
            actorId,
            action: 'user.signup.reject',
            resource: 'user',
            resourceId: userId,
            status: 'success',
            details: {
                email: updated.email,
                reason: reason?.trim() || null,
            },
        },
    });

    return {
        ...formatPendingUser(updated),
        rejection_reason: reason?.trim() || null,
    };
}

export async function getSignupUserById(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }
    return toApiDoc(user as any);
}
