import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser, ForbiddenError, AuthRequiredError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://137.23.56.134:5001/api'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireActiveUser(request)
    const authHeader = request.headers.get('Authorization') || ''
    const body = await request.json().catch(() => ({}))

    const rawPlan = (body.plan || 'freelancer').toString().toLowerCase()
    const resolvedPlan =
      rawPlan === 'freelancer' || rawPlan === 'paid'
        ? 'paid'
        : rawPlan === 'agency' || rawPlan === 'enterprise'
        ? 'enterprise'
        : rawPlan

    // 1. First, attempt to proxy to the backend payment engine (active Razorpay credentials & DB)
    if (API_URL) {
      try {
        const res = await fetch(`${API_URL}/payments/razorpay/order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            plan: resolvedPlan,
            mode: body.mode || 'one_time',
          }),
          signal: AbortSignal.timeout(15000),
        })

        const json = await res.json().catch(() => null)

        if (res.ok && json) {
          const orderData = json.data || json
          return NextResponse.json(
            {
              success: true,
              data: {
                order_id: orderData.order_id || orderData.id,
                key_id:
                  orderData.key_id ||
                  process.env.RAZORPAY_KEY_ID ||
                  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency || 'INR',
                plan: resolvedPlan,
                name: orderData.name || 'Lead Hunter Club',
                description: orderData.description || `Plan upgrade — ${resolvedPlan}`,
                prefill: orderData.prefill || {
                  name: authUser.name,
                  email: authUser.email,
                },
              },
              order_id: orderData.order_id || orderData.id,
              key_id:
                orderData.key_id ||
                process.env.RAZORPAY_KEY_ID ||
                process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
              amount: orderData.amount,
              currency: orderData.currency || 'INR',
              message: json.message || 'Order created',
            },
            { status: 200 },
          )
        } else {
          console.warn('[Razorpay Order Proxy] Backend responded with status:', res.status, json)
        }
      } catch (backendErr: any) {
        console.warn(
          '[Razorpay Order Proxy] Backend proxy failed, falling back to local:',
          backendErr.message,
        )
      }
    }

    // 2. Local Fallback if RAZORPAY keys are configured locally in Next.js environment:
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (keyId && keySecret) {
      const { getRazorpay } = await import('@/lib/razorpay')
      const { db } = await import('@/lib/db')
      const razorpay = getRazorpay()

      let price = 999
      let planDisplayName = `Plan upgrade — ${resolvedPlan}`

      try {
        const plansSetting = await db.setting.findUnique({ where: { key: 'plans_config' } })
        if (plansSetting?.value && Array.isArray(plansSetting.value)) {
          const match = (plansSetting.value as any[]).find(
            (p: any) =>
              p.id?.toLowerCase() === resolvedPlan ||
              (resolvedPlan === 'paid' && (p.id?.toUpperCase() === 'FREELANCER' || p.id?.toLowerCase() === 'paid')) ||
              (resolvedPlan === 'enterprise' && (p.id?.toUpperCase() === 'AGENCY' || p.id?.toLowerCase() === 'enterprise'))
          )
          if (match) {
            if (typeof match.price === 'number' && !isNaN(match.price)) price = match.price
            if (match.name) planDisplayName = match.name
          }
        }
      } catch (err) {
        console.warn('[Razorpay Order Fallback] Failed to read dynamic price from setting:', err)
        const priceMap: Record<string, number> = {
          freelancer: 999,
          paid: 999,
          agency: 2499,
          enterprise: 2499,
        }
        price = priceMap[resolvedPlan] || 999
      }

      const amountPaise = Math.round(price * 100)

      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `plan-${resolvedPlan}-${authUser.uid.slice(0, 10)}_${Date.now()}`.slice(0, 40),
        notes: { userId: authUser.uid, plan: resolvedPlan },
      })

      return NextResponse.json({
        success: true,
        data: {
          order_id: order.id,
          key_id: keyId,
          amount: amountPaise,
          currency: 'INR',
          plan: resolvedPlan,
          name: 'Lead Hunter Club',
          description: `Plan upgrade — ${resolvedPlan}`,
          prefill: {
            name: authUser.name,
            email: authUser.email,
          },
        },
        order_id: order.id,
        key_id: keyId,
        amount: price,
        currency: 'INR',
      })
    }

    return NextResponse.json(
      {
        success: false,
        code: 'PAYMENT_UNAVAILABLE',
        message:
          'Payment gateway configuration is temporarily unavailable. Please try again shortly or contact support.',
      },
      { status: 503 },
    )
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    console.error('[Razorpay Order] Error:', error)
    return NextResponse.json(
      {
        success: false,
        code: 'PAYMENT_PROVIDER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create payment order',
      },
      { status: 500 },
    )
  }
}
