import { Request, Response } from 'express';
import asyncHandler from '../middleware/async';
import ErrorResponse from '../utils/error-response.utils';
import * as paymentService from '../services/payment.service';

export const listPaymentPlans = asyncHandler(async (_req: Request, res: Response) => {
    const catalog = paymentService.getPaymentCatalog();
    return res.status(200).json({
        success: true,
        data: catalog.plans,
        configured: catalog.configured,
    });
});

export const createPaymentOrder = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const plan = req.body?.plan;
    if (!plan || typeof plan !== 'string') {
        throw new ErrorResponse('plan is required (paid | enterprise).', 400);
    }

    const data = await paymentService.createRazorpayOrder(
        (user._id || user.id).toString(),
        plan
    );

    return res.status(201).json({
        success: true,
        data,
        message: 'Razorpay order created.',
    });
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ErrorResponse(
            'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
            400
        );
    }

    const data = await paymentService.verifyRazorpayPayment((user._id || user.id).toString(), {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
    });

    return res.status(200).json({
        success: true,
        data,
        message: data.message || 'Payment verified.',
    });
});

export const razorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const data = await paymentService.handleRazorpayWebhook(rawBody, signature);
    return res.status(200).json({ success: true, data });
});

export const createTokenTopupOrder = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const { pack } = req.body || {};
    if (!pack) throw new ErrorResponse('pack is required (topup_10 | topup_50 | topup_100).', 400);

    const data = await paymentService.createTokenTopupOrder(
        (user._id || user.id).toString(),
        pack
    );

    return res.status(201).json({
        success: true,
        data,
        message: 'Token top-up order created.',
    });
});
