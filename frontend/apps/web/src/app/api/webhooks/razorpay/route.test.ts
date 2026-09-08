import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  verifySignature: vi.fn(),
  fetchSubscription: vi.fn(),
  fetchOrder: vi.fn(),
  auditFindFirst: vi.fn(),
  auditCreate: vi.fn(),
  userFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdate: vi.fn(),
  activatePlan: vi.fn(),
  renew: vi.fn(),
  cancel: vi.fn(),
  getPlanByRazorpayPlanId: vi.fn(),
}))

vi.mock('@/lib/razorpay', () => ({
  getRazorpay: () => ({
    subscriptions: { fetch: mocks.fetchSubscription },
    orders: { fetch: mocks.fetchOrder },
  }),
  getRazorpayWebhookSecret: () => {
    const s = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!s) throw new Error('RAZORPAY_WEBHOOK_SECRET environment variable is required')
    return s
  },
  verifyRazorpaySignature: mocks.verifySignature,
  isRazorpayConfigured: () => true,
}))

vi.mock('@/lib/config/plans', () => ({
  getPlanByRazorpayPlanId: mocks.getPlanByRazorpayPlanId,
}))

vi.mock('@/lib/db', () => ({
  db: {
    auditLog: {
      findFirst: mocks.auditFindFirst,
      create: mocks.auditCreate,
    },
    user: {
      findUnique: mocks.userFindUnique,
      findFirst: mocks.userFindFirst,
      update: mocks.userUpdate,
    },
  },
}))

vi.mock('@/lib/services/payment', () => ({
  paymentService: {
    activatePlan: mocks.activatePlan,
    renew: mocks.renew,
    cancel: mocks.cancel,
  },
}))

import { POST } from '@/app/api/webhooks/razorpay/route'

function makeRequest(payload: unknown, signature?: string | null) {
  const headers = new Headers()
  if (signature !== null) {
    headers.set('x-razorpay-signature', signature ?? 'valid-sig')
  }
  return new NextRequest('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers,
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  })
}

function paymentEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_1',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_1',
          customer_id: 'cust_1',
          subscription_id: 'sub_1',
          order_id: 'order_1',
          plan_id: 'plan_1',
          ...overrides,
        },
      },
      subscription: {
        entity: {
          id: 'sub_1',
          customer_id: 'cust_1',
          plan_id: 'plan_1',
          current_period_end: 1800000000,
        },
      },
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.RAZORPAY_WEBHOOK_SECRET = 'secret'
  mocks.verifySignature.mockReturnValue(true)
  mocks.auditFindFirst.mockResolvedValue(null)
  mocks.auditCreate.mockResolvedValue({})
  mocks.getPlanByRazorpayPlanId.mockReturnValue({ id: 'FREELANCER' })
})

afterEach(() => {
  delete process.env.RAZORPAY_WEBHOOK_SECRET
})

describe('Razorpay webhook', () => {
  it('returns 400 when signature header is missing', async () => {
    const res = await POST(makeRequest({ id: 'e1', event: 'x' }, null))
    expect(res.status).toBe(400)
  })

  it('returns 500 when webhook secret is not configured', async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    const res = await POST(makeRequest({ id: 'e1', event: 'x' }))
    expect(res.status).toBe(500)
  })

  it('returns 400 when signature verification fails', async () => {
    mocks.verifySignature.mockReturnValue(false)
    const res = await POST(makeRequest({ id: 'e1', event: 'x' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    const res = await POST(makeRequest('not json'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when event id or type is missing', async () => {
    const res = await POST(makeRequest({ id: 'e1' }))
    expect(res.status).toBe(400)
  })

  it('short-circuits duplicate events without reprocessing', async () => {
    mocks.auditFindFirst.mockResolvedValue({ id: 'audit-1' })

    const res = await POST(makeRequest(paymentEvent()))
    expect(res.status).toBe(200)
    expect(mocks.activatePlan).not.toHaveBeenCalled()
    expect(mocks.renew).not.toHaveBeenCalled()
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('renews when user already has the subscription', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 'user-1', razorpaySubscriptionId: 'sub_1' })

    const res = await POST(makeRequest(paymentEvent()))
    expect(res.status).toBe(200)
    expect(mocks.renew).toHaveBeenCalledWith('user-1', 'razorpay', new Date(1800000000 * 1000))
    expect(mocks.auditCreate).toHaveBeenCalled()
  })

  it('activates a new plan when subscription is not yet linked', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 'user-1', razorpaySubscriptionId: null })

    const res = await POST(makeRequest(paymentEvent()))
    expect(res.status).toBe(200)
    expect(mocks.activatePlan).toHaveBeenCalledWith({
      userId: 'user-1',
      plan: 'FREELANCER',
      provider: 'razorpay',
      customerId: 'cust_1',
      subscriptionId: 'sub_1',
      priceId: 'plan_1',
      periodEnd: new Date(1800000000 * 1000),
    })
  })

  it('activates a one-time order plan from order notes', async () => {
    mocks.fetchOrder.mockResolvedValue({
      id: 'order_1',
      notes: { userId: 'user-2', plan: 'AGENCY' },
    })

    const evt = paymentEvent({ subscription_id: null, order_id: 'order_1' })
    delete evt.payload.subscription.entity.subscription_id

    const res = await POST(makeRequest(evt))
    expect(res.status).toBe(200)
    expect(mocks.activatePlan).toHaveBeenCalledWith({
      userId: 'user-2',
      plan: 'AGENCY',
      provider: 'razorpay',
      priceId: 'AGENCY',
    })
  })

  it('cancels the plan on subscription.cancelled', async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 'user-1', razorpaySubscriptionId: 'sub_1' })

    const res = await POST(
      makeRequest({
        id: 'evt_2',
        event: 'subscription.cancelled',
        payload: { subscription: { entity: { id: 'sub_1', customer_id: 'cust_1' } } },
      }),
    )

    expect(res.status).toBe(200)
    expect(mocks.cancel).toHaveBeenCalledWith('user-1', 'razorpay')
  })

  it('returns 500 when event processing throws', async () => {
    mocks.userFindUnique.mockRejectedValue(new Error('db down'))
    const res = await POST(makeRequest(paymentEvent()))
    expect(res.status).toBe(500)
  })
})