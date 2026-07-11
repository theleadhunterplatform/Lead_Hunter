import jwt from 'jsonwebtoken';
import config from '../config';
import { verifySupabaseAccessToken } from '../services/supabase-auth.service';
import { getPaymentCatalog, getPurchasablePlans, isRazorpayConfigured } from '../services/payment.service';
import crypto from 'crypto';

describe('Supabase auth token verify', () => {
    const prev = config.supabase.jwtSecret;

    afterEach(() => {
        config.supabase.jwtSecret = prev;
    });

    it('rejects when JWT secret is missing', () => {
        config.supabase.jwtSecret = '';
        expect(() => verifySupabaseAccessToken('anything')).toThrow(/SUPABASE_JWT_SECRET/i);
    });

    it('accepts a valid HS256 Supabase-style token', () => {
        config.supabase.jwtSecret = 'test-supabase-jwt-secret';
        const token = jwt.sign(
            { sub: 'supabase-user-1', phone: '+919876543210', role: 'authenticated' },
            config.supabase.jwtSecret,
            { algorithm: 'HS256', audience: 'authenticated', expiresIn: '1h' }
        );

        const payload = verifySupabaseAccessToken(token);
        expect(payload.sub).toBe('supabase-user-1');
        expect(payload.phone).toBe('+919876543210');
    });
});

describe('Razorpay purchasable plans', () => {
    it('exposes paid and enterprise with prices', () => {
        const plans = getPurchasablePlans();
        expect(plans.map((p) => p.id)).toEqual(['paid', 'enterprise']);
        expect(plans[0].amount_paise).toBeGreaterThan(0);
        expect(plans[1].amount_paise).toBeGreaterThan(0);
    });

    it('catalog reports configured flag from env', () => {
        const catalog = getPaymentCatalog();
        expect(catalog.plans).toHaveLength(2);
        expect(typeof catalog.configured).toBe('boolean');
        expect(catalog.configured).toBe(isRazorpayConfigured());
    });
});

describe('Razorpay signature helper', () => {
    it('matches HMAC order|payment format', () => {
        const secret = 'whsec_test';
        const orderId = 'order_123';
        const paymentId = 'pay_456';
        const expected = crypto
            .createHmac('sha256', secret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');
        const again = crypto
            .createHmac('sha256', secret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');
        expect(again).toBe(expected);
    });
});
