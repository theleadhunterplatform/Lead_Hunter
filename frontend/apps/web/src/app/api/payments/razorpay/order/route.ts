import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveUser, ForbiddenError, AuthRequiredError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://137.23.56.134:5001/api'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireActiveUser(request)
    const body = await request.json().catch(() => ({}))

    const rawPlan = (body.plan || 'freelancer').toString().toUpperCase()
    const resolvedPlan =
      rawPlan === 'FREELANCER' || rawPlan === 'PAID'
        ? 'FREELANCER'
        : rawPlan === 'AGENCY' || rawPlan === 'ENTERPRISE'
        ? 'AGENCY'
        : rawPlan

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    // 1. Primary: Direct dynamic Razorpay order creation via Next.js
    if (keyId && keySecret) {
      const { getRazorpay } = await import('@/lib/razorpay')
      const razorpay = getRazorpay()

      let price = 999
      let planDisplayName = `Plan upgrade — ${resolvedPlan}`
      let credits = 500

      try {
        const plansSetting = await db.setting.findUnique({ where: { key: 'plans_config' } })
        if (plansSetting?.value && Array.isArray(plansSetting.value)) {
          const match = (plansSetting.value as any[]).find(
            (p: any) =>
              p.id?.toUpperCase() === resolvedPlan ||
              (resolvedPlan === 'FREELANCER' && (p.id?.toLowerCase() === 'paid' || p.id?.toUpperCase() === 'FREELANCER')) ||
              (resolvedPlan === 'AGENCY' && (p.id?.toLowerCase() === 'enterprise' || p.id?.toUpperCase() === 'AGENCY'))
          )
          if (match) {
            if (typeof match.price === 'number' && !isNaN(match.price)) price = match.price
            if (match.name) planDisplayName = match.name
            if (typeof match.credits === 'number' && !isNaN(match.credits)) credits = match.credits
          }
        }
      } catch (err) {
        console.warn('[Razorpay Order] Failed to read dynamic price from setting:', err)
        const priceMap: Record<string, number> = {
          FREELANCER: 999,
          AGENCY: 2499,
        }
        price = priceMap[resolvedPlan] || 999
      }

      const amountPaise = Math.round(price * 100)

      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `plan-${resolvedPlan.toLowerCase()}-${authUser.uid.slice(0, 10)}_${Date.now()}`.slice(0, 40),
        notes: {
          userId: authUser.uid,
          plan: resolvedPlan,
          credits,
        },
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
          description: `${planDisplayName} (${credits} Monthly Credits)`,
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

    // 2. Fallback to external backend proxy only if local keys are completely missing
    if (API_URL) {
      try {
        const authHeader = request.headers.get('Authorization') || ''
        const res = await fetch(`${API_URL}/payments/razorpay/order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            plan: resolvedPlan.toLowerCase(),
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
                key_id: orderData.key_id,
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
              key_id: orderData.key_id,
              amount: orderData.amount,
              currency: orderData.currency || 'INR',
              message: json.message || 'Order created',
            },
            { status: 200 },
          )
        }
      } catch (backendErr: any) {
        console.warn('[Razorpay Order Proxy] Backend proxy failed:', backendErr?.message)
      }
    }

    return NextResponse.json(
      {
        success: false,
        code: 'PAYMENT_UNAVAILABLE',
        message: 'Payment gateway configuration is temporarily unavailable. Please try again shortly or contact support.',
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
