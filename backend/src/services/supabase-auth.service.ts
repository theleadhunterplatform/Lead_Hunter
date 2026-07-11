import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import config from '../config';
import ErrorResponse from '../utils/error-response.utils';
import { generateTokenPair } from '../utils/token.utils';
import { hashPassword } from '../utils/password.utils';
import { generateSecureToken } from '../utils/crypto-token.utils';
import { isSignupApprovalRequired } from '../utils/signup-approval.utils';
import Role from '../models/role.model';
import RoleAssignment from '../models/role-assignment.model';
import { getPlanDefinition } from '../utils/plan.utils';

type SupabaseJwtPayload = {
    sub: string;
    phone?: string;
    email?: string;
    role?: string;
    user_metadata?: {
        name?: string;
        full_name?: string;
    };
};

function phoneToSyntheticEmail(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return `phone_${digits}@users.leadhunter.app`;
}

function displayNameFromPhone(phone: string, fallback?: string): string {
    if (fallback?.trim()) return fallback.trim();
    return `Hunter ${phone.replace(/\D/g, '').slice(-4) || 'User'}`;
}

export function verifySupabaseAccessToken(accessToken: string): SupabaseJwtPayload {
    const secret = config.supabase.jwtSecret;
    if (!secret?.trim()) {
        throw new ErrorResponse(
            'SUPABASE_JWT_SECRET is not configured. Add it from Supabase Project Settings → API → JWT Secret.',
            503
        );
    }

    try {
        const payload = jwt.verify(accessToken, secret, {
            algorithms: ['HS256'],
            audience: 'authenticated',
        }) as SupabaseJwtPayload;

        if (!payload?.sub) {
            throw new ErrorResponse('Invalid Supabase token: missing subject.', 401);
        }
        return payload;
    } catch (error: any) {
        if (error instanceof ErrorResponse) throw error;
        throw new ErrorResponse('Invalid or expired Supabase access token.', 401);
    }
}

/**
 * Exchange a Supabase Auth access token (phone OTP) for Lead Hunter JWTs.
 * Frontend: Supabase signInWithOtp → verifyOtp → POST this with access_token.
 */
export async function loginWithSupabaseToken(input: {
    access_token: string;
    name?: string;
}) {
    const payload = verifySupabaseAccessToken(input.access_token);
    const phone = (payload.phone || '').trim() || null;
    const emailFromToken = (payload.email || '').trim().toLowerCase() || null;
    const email = emailFromToken || (phone ? phoneToSyntheticEmail(phone) : null);

    if (!email) {
        throw new ErrorResponse('Supabase token must include phone or email.', 400);
    }

    const name =
        input.name?.trim() ||
        payload.user_metadata?.name ||
        payload.user_metadata?.full_name ||
        displayNameFromPhone(phone || email);

    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { supabase_user_id: payload.sub },
                ...(phone ? [{ phone }] : []),
                { email },
            ],
            is_deleted: false,
        },
    });

    if (!user) {
        const needsApproval = isSignupApprovalRequired(emailFromToken || email);
        const plan = getPlanDefinition('free');

        user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                supabase_user_id: payload.sub,
                password: await hashPassword(generateSecureToken(24)),
                status: needsApproval ? 'pending' : 'active',
                is_active: !needsApproval,
                lead_access_enabled: !needsApproval,
                plan: 'free',
                tokens: needsApproval ? 0 : plan.monthly_tokens,
            },
        });

        const role = await Role.findOne({ slug: 'normal_user' });
        if (role) {
            await RoleAssignment.create({
                userId: user.id,
                roleId: role._id || role.id,
                scope: { type: 'global', organizationId: null },
                assignedBy: user.id,
            });
        }

        if (needsApproval) {
            return {
                approval_required: true,
                message: 'Account created. Awaiting admin approval before you can use the app.',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    status: user.status,
                    plan: user.plan,
                },
            };
        }
    } else {
        const updates: Record<string, unknown> = {};
        if (!user.supabase_user_id) updates.supabase_user_id = payload.sub;
        if (phone && !user.phone) updates.phone = phone;
        if (Object.keys(updates).length > 0) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: updates,
            });
        }
    }

    if (user.status === 'pending') {
        return {
            approval_required: true,
            message: 'Your account is pending admin approval.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                status: user.status,
                plan: user.plan,
            },
        };
    }
    if (user.status === 'rejected') {
        return {
            approval_required: true,
            message: 'Your signup was rejected. Contact support if you believe this is a mistake.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                status: user.status,
                plan: user.plan,
            },
        };
    }
    if (!user.is_active || user.is_deleted) {
        throw new ErrorResponse('Account is disabled', 403);
    }

    const tokens = generateTokenPair(user.id);

    return {
        ...tokens,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            plan: user.plan,
            tokens: user.tokens,
            status: user.status,
            organization: user.organizationId,
            must_change_password: user.must_change_password,
        },
    };
}
