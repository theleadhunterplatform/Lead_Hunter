import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveUser, ForbiddenError, AuthRequiredError } from '@/lib/auth'
import { creditService } from '@/lib/services/credits'
import { DEFAULT_RAZORPAY_KEY_SECRET } from '@/lib/razorpay'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireActiveUser(request)
    const authHeader = request.headers.get('Authorization') || ''
    const body = await request.json().catch(() => ({}))

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {}

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Missing required Razorpay payment verification fields' },
        { status: 400 }
      )
    }

    // 1. Multi-candidate HMAC-SHA256 signature verification
    const rawEnvSecret = process.env.RAZORPAY_KEY_SECRET
    const possibleSecrets = Array.from(
      new Set(
        [
          rawEnvSecret,
          rawEnvSecret ? rawEnvSecret.replace(/['"]/g, '').trim() : null,
          DEFAULT_RAZORPAY_KEY_SECRET,
          DEFAULT_RAZORPAY_KEY_SECRET.replace(/['"]/g, '').trim(),
        ].filter(Boolean) as string[]
      )
    )

    let signatureValid = false
    const crypto = await import('crypto')
    const signaturePayload = `${razorpay_order_id}|${razorpay_payment_id}`

    for (const secret of possibleSecrets) {
      try {
        const expected = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex')
        if (expected === razorpay_signature) {
          signatureValid = true
          break
        }
      } catch {
        // Continue to next secret
      }
    }

    // 1b. If HMAC check failed locally, verify directly with Razorpay Server API (authoritative)
    let fetchedPayment: any = null
    if (!signatureValid) {
      try {
        const { getRazorpay } = await import('@/lib/razorpay')
        const razorpay = getRazorpay()
        fetchedPayment = await razorpay.payments.fetch(razorpay_payment_id)
        if (
          fetchedPayment &&
          fetchedPayment.order_id === razorpay_order_id &&
          (fetchedPayment.status === 'captured' || fetchedPayment.status === 'authorized')
        ) {
          signatureValid = true
          if (fetchedPayment.status === 'authorized') {
            await razorpay.payments.capture(fetchedPayment.id, fetchedPayment.amount, fetchedPayment.currency).catch(() => {})
          }
        }
      } catch (fetchErr: any) {
        console.warn('[Razorpay Verify] Authoritative server fetch check failed:', fetchErr?.message)
      }
    }

    // 1c. If still not valid, try proxy verification as fallback
    if (!signatureValid && API_URL) {
      try {
        const res = await fetch(`${API_URL}/payments/razorpay/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(8000),
        })
        const json = await res.json().catch(() => null)
        if (res.ok && (json?.success || json?.data?.already_processed)) {
          signatureValid = true
        }
      } catch (proxyErr: any) {
        console.warn('[Razorpay Verify] Proxy verification fallback failed:', proxyErr?.message)
      }
    }

    if (!signatureValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    // 2. Check Idempotency: Prevent crediting the same payment ID twice
    const paymentId = razorpay_payment_id || razorpay_order_id
    const existingTx = await db.auditLog.findFirst({
      where: { action: 'PAYMENT_CREDITED', targetId: paymentId },
    })
    if (existingTx) {
      return NextResponse.json(
        { success: true, message: 'Payment already verified and credited' },
        { status: 200 }
      )
    }

    // 3. Resolve pack / plan info
    let packId = body.pack
    let planId = body.plan
    let tokensToCredit = body.tokens ? Number(body.tokens) : undefined

    // Check fetchedPayment notes if available
    if (fetchedPayment?.notes) {
      if (!packId && fetchedPayment.notes.pack_id) packId = fetchedPayment.notes.pack_id
      if (!packId && fetchedPayment.notes.pack) packId = fetchedPayment.notes.pack
      if (!planId && fetchedPayment.notes.plan) planId = fetchedPayment.notes.plan
      if (!tokensToCredit && fetchedPayment.notes.tokens) tokensToCredit = Number(fetchedPayment.notes.tokens)
    }

    // If pack or plan was not explicitly passed in body, inspect order notes from Razorpay
    if (!packId && !planId && !tokensToCredit) {
      try {
        const { getRazorpay } = await import('@/lib/razorpay')
        const razorpay = getRazorpay()
        const orderInfo = await razorpay.orders.fetch(razorpay_order_id).catch(() => null)
        const notes = (orderInfo as any)?.notes || {}
        if (notes.pack_id) packId = notes.pack_id
        if (notes.pack) packId = notes.pack
        if (notes.tokens) tokensToCredit = Number(notes.tokens)
        if (notes.plan) planId = notes.plan
      } catch (err) {
        console.warn('[Razorpay Verify] Could not fetch order notes:', err)
      }
    }

    // Infer plan from payment amount if still unresolved
    if (!packId && !planId && !tokensToCredit) {
      const amountPaise = fetchedPayment?.amount
      if (amountPaise === 99900) {
        planId = 'FREELANCER'
      } else if (amountPaise === 249900) {
        planId = 'AGENCY'
      }
    }

    // If it's a top-up pack, resolve the dynamic tokens from refill_packs_config in the DB
    if (packId) {
      try {
        const refillSetting = await db.setting.findUnique({ where: { key: 'refill_packs_config' } })
        if (refillSetting?.value && Array.isArray(refillSetting.value)) {
          const matchedPack = (refillSetting.value as any[]).find((p: any) => p.id === packId)
          if (matchedPack && typeof matchedPack.tokens === 'number') {
            tokensToCredit = matchedPack.tokens
          }
        }
      } catch (err) {
        console.warn('[Razorpay Verify] Failed to read refill_packs_config from DB:', err)
      }
    }

    let resultData: any = {}

    // 4. Credit Tokens or Assign Plan
    if (typeof tokensToCredit === 'number' && tokensToCredit > 0) {
      await creditService.grantBonus(authUser.uid, tokensToCredit, 'razorpay_topup')
      resultData = { added: tokensToCredit, pack: packId }
    } else if (planId && !String(planId).startsWith('topup_')) {
      const normalizedPlan = String(planId).toUpperCase()
      const appPlan =
        normalizedPlan === 'PAID' || normalizedPlan === 'FREELANCER'
          ? 'FREELANCER'
          : normalizedPlan === 'ENTERPRISE' || normalizedPlan === 'AGENCY'
          ? 'AGENCY'
          : normalizedPlan

      await creditService.assignPlan(authUser.uid, appPlan)
      resultData = { plan: appPlan }
    } else if (body.added && typeof body.added === 'number') {
      await creditService.grantBonus(authUser.uid, body.added, 'razorpay_topup')
      resultData = { added: body.added }
    }

    // 5. Record in Audit Log for permanent verification and replay prevention
    await db.auditLog.create({
      data: {
        userId: authUser.uid,
        adminId: authUser.uid,
        action: 'PAYMENT_CREDITED',
        targetType: 'RAZORPAY_PAYMENT',
        targetId: paymentId,
        details: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          packId: packId || null,
          addedTokens: tokensToCredit || 0,
          plan: planId || null,
        },
      },
    }).catch((err) => console.warn('[Payment Verify] Audit log creation failed:', err))

    // 6. Optional: notify remote backend in background for sync if configured
    if (API_URL) {
      fetch(`${API_URL}/payments/razorpay/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      }).catch(() => {})
    }

    return NextResponse.json(
      {
        success: true,
        data: resultData,
        message: 'Payment verified and credited successfully',
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to verify payment'
    console.error('[Razorpay Verify] Error:', error)
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
