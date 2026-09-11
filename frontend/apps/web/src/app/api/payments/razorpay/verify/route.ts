import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveUser, ForbiddenError, AuthRequiredError } from '@/lib/auth'
import { creditService } from '@/lib/services/credits'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireActiveUser(request)

    const authHeader = request.headers.get('Authorization') || ''
    const body = await request.json()

    const res = await fetch(`${API_URL}/payments/razorpay/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json()

    if (res.ok && data.success) {
      // 1. If backend already marked this payment as processed, do NOT credit tokens or plans again
      if (data.data?.already_processed === true) {
        return NextResponse.json(data, { status: res.status })
      }

      const paymentId = body.razorpay_payment_id || body.razorpay_order_id
      if (paymentId) {
        // 2. Check local database idempotency: Has this specific payment ID already been credited?
        const existingTx = await db.auditLog.findFirst({
          where: { action: 'PAYMENT_CREDITED', targetId: paymentId },
        })
        if (existingTx) {
          return NextResponse.json({ ...data, message: 'Payment already credited' }, { status: 200 })
        }
      }

      const addedTokens = data.data?.added
      const verifiedPlan = data.data?.plan

      if (typeof addedTokens === 'number' && addedTokens > 0) {
        await creditService.grantBonus(authUser.uid, addedTokens, 'razorpay_topup')
      } else if (verifiedPlan && !verifiedPlan.startsWith('topup_')) {
        const appPlan =
          verifiedPlan === 'paid' || verifiedPlan === 'freelancer'
            ? 'FREELANCER'
            : verifiedPlan === 'enterprise' || verifiedPlan === 'agency'
            ? 'AGENCY'
            : verifiedPlan.toUpperCase()
        await creditService.assignPlan(authUser.uid, appPlan)
      }

      // Record payment credit in audit log to prevent any future replay
      if (paymentId) {
        await db.auditLog.create({
          data: {
            userId: authUser.uid,
            adminId: authUser.uid,
            action: 'PAYMENT_CREDITED',
            targetType: 'RAZORPAY_PAYMENT',
            targetId: paymentId,
            details: {
              orderId: body.razorpay_order_id,
              addedTokens: addedTokens || 0,
              plan: verifiedPlan || null,
            },
          },
        }).catch((err) => console.warn('[Payment Verify] Audit log creation failed:', err))
      }
    }

    return NextResponse.json(data, { status: res.status })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to verify payment'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
