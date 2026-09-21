import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireActiveUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getRazorpay } from '@/lib/razorpay'
import { getPlan } from '@/lib/config/plans'

export const dynamic = 'force-dynamic'

const orderSchema = z.object({
  plan: z.enum(['FREELANCER', 'AGENCY']),
  mode: z.enum(['subscription', 'one_time']).default('subscription'),
})

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireActiveUser(request)
    const userId = authUser.uid

    const body = await request.json()
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { plan: planId, mode } = parsed.data
    const plan = getPlan(planId)
    if (!plan || plan.price <= 0) {
      return NextResponse.json(
        { code: 'PLAN_UNAVAILABLE', message: 'This plan is not available for purchase' },
        { status: 400 },
      )
    }

    if (mode === 'subscription' && !plan.razorpayPlanId) {
      return NextResponse.json(
        {
          code: 'RAZORPAY_PLAN_NOT_CONFIGURED',
          message: 'Razorpay plan is not configured yet. Please set the plan ID on the Razorpay dashboard.',
        },
        { status: 400 },
      )
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ code: 'USER_NOT_FOUND', message: 'User not found' }, { status: 404 })
    }

    const razorpay = getRazorpay()
    const amountPaise = plan.price * 100

    if (mode === 'subscription') {
      let customerId = user.razorpayCustomerId
      if (!customerId) {
        const customer = await razorpay.customers.create({
          name: user.name || 'LeadHunter User',
          email: user.email,
          contact: user.phone?.replace(/[^0-9]/g, '') || undefined,
          notes: { userId },
        })
        customerId = customer.id
        await db.user.update({ where: { id: userId }, data: { razorpayCustomerId: customerId } })
      }

      const subscription = await razorpay.subscriptions.create({
        plan_id: plan.razorpayPlanId!,
        customer_id: customerId,
        customer_notify: 1,
        total_count: 9999,
        notes: { userId },
      })

      await db.user.update({
        where: { id: userId },
        data: { razorpaySubscriptionId: subscription.id },
      })

      return NextResponse.json({
        success: true,
        key_id: process.env.RAZORPAY_KEY_ID,
        mode: 'subscription',
        subscription_id: subscription.id,
        customer_id: customerId,
        amount: plan.price,
        currency: 'INR',
      })
    }

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `plan-${planId}-${userId.slice(0, 12)}`,
      notes: { userId, plan: planId },
    })

    return NextResponse.json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID,
      mode: 'one_time',
      order_id: order.id,
      amount: plan.price,
      currency: 'INR',
    })
  } catch (err: any) {
    console.error('[Razorpay Order] Error:', err.message)
    return NextResponse.json(
      { code: 'PAYMENT_PROVIDER_ERROR', message: 'Failed to create payment. Please try again.' },
      { status: 500 },
    )
  }
}
