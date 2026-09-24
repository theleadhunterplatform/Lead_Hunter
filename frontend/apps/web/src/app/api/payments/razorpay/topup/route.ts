import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveUser, ForbiddenError, AuthRequiredError } from '@/lib/auth'
import { DEFAULT_REFILL_PACKS } from '@/app/api/admin/plans/route'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireActiveUser(request)

    const authHeader = request.headers.get('Authorization') || ''
    const body = await request.json()

    // 1. First, attempt to proxy to backend payment service
    if (API_URL) {
      try {
        const res = await fetch(`${API_URL}/payments/razorpay/topup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        })

        const data = await res.json().catch(() => null)
        if (res.ok && data) {
          return NextResponse.json(data, { status: res.status })
        }
      } catch (backendErr: any) {
        console.warn('[Razorpay Topup Proxy] Backend proxy failed, falling back to local:', backendErr?.message)
      }
    }

    // 2. Local fallback if backend is unavailable or direct Razorpay keys are configured
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (keyId && keySecret) {
      let packs = DEFAULT_REFILL_PACKS
      try {
        const refillSetting = await db.setting.findUnique({ where: { key: 'refill_packs_config' } })
        if (refillSetting?.value && Array.isArray(refillSetting.value)) {
          packs = (refillSetting.value as any[]).filter((p: any) => p.isActive !== false)
        }
      } catch (err) {
        console.warn('[Razorpay Topup] Failed to read dynamic refill packs from db:', err)
      }

      const pack = packs.find((p: any) => p.id === body.pack)
      if (!pack) {
        return NextResponse.json({ code: 'INVALID_PACK', message: 'Selected refill pack not found' }, { status: 400 })
      }

      const { getRazorpay } = await import('@/lib/razorpay')
      const razorpay = getRazorpay()
      const amountPaise = Math.round(Number(pack.price) * 100)

      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `topup-${authUser.uid.slice(0, 10)}_${Date.now()}`.slice(0, 40),
        notes: { userId: authUser.uid, pack: pack.id, tokens: pack.tokens },
      })

      return NextResponse.json({
        success: true,
        data: {
          order_id: order.id,
          key_id: keyId,
          amount: amountPaise,
          currency: 'INR',
          tokens: pack.tokens,
          label: pack.label || `${pack.tokens} Credits`,
          name: 'Lead Hunter Club',
          description: `Token Top-Up — ${pack.label || pack.tokens + ' Credits'}`,
          prefill: {
            name: authUser.name,
            email: authUser.email,
          },
        },
      })
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
    const msg = error instanceof Error ? error.message : 'Failed to create topup order'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
