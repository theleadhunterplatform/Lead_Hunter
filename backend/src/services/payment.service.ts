import crypto from 'crypto';
import axios from 'axios';
import prisma from '../lib/prisma';
import config from '../config';
import ErrorResponse from '../utils/error-response.utils';
import { isPlanId, getPlanDefinition, PlanId } from '../utils/plan.utils';
import { setUserPlan } from './plan.service';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

export function isRazorpayConfigured() {
    return Boolean(config.razorpay.keyId?.trim() && config.razorpay.keySecret?.trim());
}

function assertRazorpayConfigured() {
    if (!isRazorpayConfigured()) {
        throw new ErrorResponse(
            'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
            503
        );
    }
}

function authHeader() {
    const token = Buffer.from(
        `${config.razorpay.keyId}:${config.razorpay.keySecret}`
    ).toString('base64');
    return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

export function getPurchasablePlans() {
    return (['paid', 'enterprise'] as PlanId[]).map((id) => {
        const plan = getPlanDefinition(id);
        return {
            ...plan,
            amount_paise: plan.price_paise,
            currency: plan.currency || 'INR',
        };
    });
}

export function getPaymentCatalog() {
    return {
        configured: isRazorpayConfigured(),
        plans: getPurchasablePlans(),
    };
}

export async function createRazorpayOrder(userId: string, planId: string) {
    assertRazorpayConfigured();

    if (!isPlanId(planId) || planId === 'free') {
        throw new ErrorResponse('Only paid or enterprise plans can be purchased.', 400);
    }

    const plan = getPlanDefinition(planId);
    if (!plan.price_paise || plan.price_paise <= 0) {
        throw new ErrorResponse(`Plan ${planId} has no price configured.`, 500);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.is_deleted || !user.is_active) {
        throw new ErrorResponse('User not found', 404);
    }
    if (user.status === 'pending') {
        throw new ErrorResponse('Account pending admin approval', 403);
    }

    const receipt = `lh_${userId.slice(0, 8)}_${Date.now()}`.slice(0, 40);

    let order: any;
    try {
        const { data } = await axios.post(
            `${RAZORPAY_API}/orders`,
            {
                amount: plan.price_paise,
                currency: plan.currency || 'INR',
                receipt,
                notes: {
                    user_id: userId,
                    plan: planId,
                },
            },
            { headers: authHeader(), timeout: 30000 }
        );
        order = data;
    } catch (error: any) {
        const detail =
            error.response?.data?.error?.description ||
            error.response?.data?.error?.reason ||
            error.message ||
            'Razorpay order failed';
        throw new ErrorResponse(`Razorpay order failed: ${detail}`, 502);
    }

    await prisma.payment.create({
        data: {
            userId,
            provider: 'razorpay',
            razorpay_order_id: order.id,
            plan: planId,
            amount_paise: plan.price_paise,
            currency: plan.currency || 'INR',
            status: 'created',
            raw_payload: order,
        },
    });

    return {
        order_id: order.id,
        amount: plan.price_paise,
        currency: plan.currency || 'INR',
        plan: planId,
        plan_name: plan.name,
        key_id: config.razorpay.keyId,
        name: 'Lead Hunter',
        description: `${plan.name} plan — ${plan.monthly_tokens} tokens / month`,
        prefill: {
            name: user.name,
            email: user.email.includes('@users.leadhunter.app') ? undefined : user.email,
            contact: user.phone || undefined,
        },
    };
}

function verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
): boolean {
    const expected = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    return expected === signature;
}

export async function verifyRazorpayPayment(
    userId: string,
    input: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }
) {
    assertRazorpayConfigured();

    const payment = await prisma.payment.findUnique({
        where: { razorpay_order_id: input.razorpay_order_id },
    });
    if (!payment || payment.userId !== userId) {
        throw new ErrorResponse('Payment order not found.', 404);
    }

    if (payment.status === 'paid') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        return {
            already_processed: true,
            plan: payment.plan,
            tokens: user?.tokens ?? 0,
            payment_id: payment.id,
        };
    }

    if (
        !verifyPaymentSignature(
            input.razorpay_order_id,
            input.razorpay_payment_id,
            input.razorpay_signature
        )
    ) {
        await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'failed', razorpay_payment_id: input.razorpay_payment_id },
        });
        throw new ErrorResponse('Invalid Razorpay payment signature.', 400);
    }

    await prisma.payment.update({
        where: { id: payment.id },
        data: {
            status: 'paid',
            razorpay_payment_id: input.razorpay_payment_id,
            razorpay_signature: input.razorpay_signature,
        },
    });

    const upgraded = await setUserPlan(userId, payment.plan, {
        refill_tokens: true,
        actorId: userId,
    });

    return {
        already_processed: false,
        plan: upgraded.plan,
        plan_name: upgraded.plan_name,
        tokens: upgraded.tokens,
        payment_id: payment.id,
        message: `Upgraded to ${upgraded.plan_name}.`,
    };
}

export async function handleRazorpayWebhook(rawBody: Buffer | string, signature: string | undefined) {
    assertRazorpayConfigured();
    const webhookSecret = config.razorpay.webhookSecret;
    if (!webhookSecret) {
        throw new ErrorResponse('RAZORPAY_WEBHOOK_SECRET is not configured.', 503);
    }
    if (!signature) {
        throw new ErrorResponse('Missing x-razorpay-signature header.', 400);
    }

    const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
    const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyString)
        .digest('hex');

    if (expected !== signature) {
        throw new ErrorResponse('Invalid Razorpay webhook signature.', 400);
    }

    let event: any;
    try {
        event = JSON.parse(bodyString);
    } catch {
        throw new ErrorResponse('Invalid webhook JSON.', 400);
    }

    const eventName = event?.event as string | undefined;
    const paymentEntity = event?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id as string | undefined;
    const paymentId = paymentEntity?.id as string | undefined;

    if (eventName === 'payment.captured' && orderId && paymentId) {
        const payment = await prisma.payment.findUnique({
            where: { razorpay_order_id: orderId },
        });
        if (!payment) {
            return { ignored: true, reason: 'unknown_order' };
        }
        if (payment.status === 'paid') {
            return { ignored: true, reason: 'already_paid' };
        }

        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'paid',
                razorpay_payment_id: paymentId,
                raw_payload: event,
            },
        });

        await setUserPlan(payment.userId, payment.plan, {
            refill_tokens: true,
            actorId: payment.userId,
        });

        return { success: true, plan: payment.plan, user_id: payment.userId };
    }

    return { ignored: true, reason: eventName || 'unhandled_event' };
}

// Token top-up packs — buy extra tokens without changing plan
const TOPUP_PACKS = [
    { id: 'topup_10', tokens: 10, price_paise: 9900, label: '10 Tokens' },
    { id: 'topup_50', tokens: 50, price_paise: 39900, label: '50 Tokens' },
    { id: 'topup_100', tokens: 100, price_paise: 69900, label: '100 Tokens' },
];

export function getTopupPacks() {
    return TOPUP_PACKS;
}

export async function createTokenTopupOrder(userId: string, packId: string) {
    assertRazorpayConfigured();

    const pack = TOPUP_PACKS.find((p) => p.id === packId);
    if (!pack) throw new ErrorResponse('Invalid top-up pack.', 400);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.is_deleted || !user.is_active) {
        throw new ErrorResponse('User not found', 404);
    }

    const receipt = `topup_${userId.slice(0, 8)}_${Date.now()}`.slice(0, 40);

    let order: any;
    try {
        const { data } = await axios.post(
            `${RAZORPAY_API}/orders`,
            {
                amount: pack.price_paise,
                currency: 'INR',
                receipt,
                notes: { user_id: userId, pack_id: packId, tokens: pack.tokens },
            },
            { headers: authHeader(), timeout: 30000 }
        );
        order = data;
    } catch (error: any) {
        const detail = error.response?.data?.error?.description || error.message || 'Razorpay order failed';
        throw new ErrorResponse(`Razorpay topup order failed: ${detail}`, 502);
    }

    await prisma.payment.create({
        data: {
            userId,
            provider: 'razorpay',
            razorpay_order_id: order.id,
            plan: `topup_${pack.tokens}`,
            amount_paise: pack.price_paise,
            currency: 'INR',
            status: 'created',
            raw_payload: order,
        },
    });

    return {
        order_id: order.id,
        amount: pack.price_paise,
        currency: 'INR',
        pack: packId,
        tokens: pack.tokens,
        label: pack.label,
        key_id: config.razorpay.keyId,
        name: 'Lead Hunter',
        description: `Token top-up — ${pack.label}`,
        prefill: { name: user.name, email: user.email, contact: user.phone || undefined },
    };
}

export async function verifyTopupPayment(
    userId: string,
    input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
) {
    assertRazorpayConfigured();

    const payment = await prisma.payment.findUnique({ where: { razorpay_order_id: input.razorpay_order_id } });
    if (!payment || payment.userId !== userId) throw new ErrorResponse('Payment order not found.', 404);
    if (payment.status === 'paid') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        return { already_processed: true, tokens: user?.tokens ?? 0 };
    }

    if (!verifyPaymentSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
        throw new ErrorResponse('Invalid Razorpay payment signature.', 400);
    }

    // Extract token count from plan field (e.g. "topup_10" → 10)
    const tokens = parseInt(payment.plan.replace('topup_', ''), 10) || 0;
    if (tokens <= 0) throw new ErrorResponse('Invalid top-up pack.', 400);

    await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'paid', razorpay_payment_id: input.razorpay_payment_id, razorpay_signature: input.razorpay_signature },
    });

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { tokens: { increment: tokens } },
    });

    return { already_processed: false, tokens: updated.tokens, added: tokens, message: `${tokens} tokens added.` };
}
