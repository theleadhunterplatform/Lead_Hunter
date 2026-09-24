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

    let data: any = null
    let resOk = false
    let resStatus = 500

    if (API_URL) {
      try {
        const res = await fetch(`${API_URL}/payments/razorpay/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        })

        data = await res.json().catch(() => null)
        resOk = res.ok
        resStatus = res.status
      } catch (err: any) {
        console.warn('[Razorpay Verify Proxy] Backend verification failed, trying local fallback:', err?.message)
      }
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!resOk && keySecret && body.razorpay_order_id && body.razorpay_payment_id && body.razorpay_signature) {
      const crypto = await import('crypto')
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
        .digest('hex')

      if (expected === body.razorpay_signature) {
        let addedTokens: number | undefined
        let resolvedPlan: string | undefined

        try {
          const { getRazorpay } = await import('@/lib/razorpay')
          const razorpay = getRazorpay()
          const orderInfo = await razorpay.orders.fetch(body.razorpay_order_id).catch(() => null)
          const notes = (orderInfo as any)?.notes || {}
          if (notes.tokens) addedTokens = Number(notes.tokens)
          if (notes.plan) resolvedPlan = String(notes.plan)
        } catch {
          // ignore
        }

        data = {
          success: true,
          data: {
            added: addedTokens,
            plan: resolvedPlan,
          },
        }
        resOk = true
        resStatus = 200
      }
    }

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
