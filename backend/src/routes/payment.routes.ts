import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
    createPaymentOrder,
    listPaymentPlans,
    razorpayWebhook,
    verifyPayment,
    createTokenTopupOrder,
} from '../controllers/payment.controller';

const router = Router();

router.get('/plans', listPaymentPlans);
router.post('/razorpay/order', protect, createPaymentOrder);
router.post('/razorpay/topup', protect, createTokenTopupOrder);
router.post('/razorpay/verify', protect, verifyPayment);
router.post('/razorpay/webhook', razorpayWebhook);

export default router;
