import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { paymentService } from '@/lib/services/payment'
import { getPlanByRazorpayPlanId } from '@/lib/config/plans'
import { getRazorpay, getRazorpayWebhookSecret, verifyRazorpaySignature } from '@/lib/razorpay'

export const dynamic = 'force-dynamic'

interface RazorpayEntity {
  id: string
  customer_id?: string | null
  subscription_id?: string | null
  order_id?: string | null
  plan_id?: string | null
  status?: string
  current_period_end?: number | null
  notes?: Record<string, unknown>
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await db.auditLog.findFirst({
    where: { action: 'WEBHOOK_PROCESSED', targetId: eventId },
  })
  return !!existing
}

async function markEventProcessed(eventId: string, eventType: string) {
  await db.auditLog.create({
    data: {
      userId: 'system',
      adminId: 'system',
      action: 'WEBHOOK_PROCESSED',
      targetType: 'RAZORPAY_EVENT',
      targetId: eventId,
      details: { eventType },
    },
  })
}

function findUserBySubscription(subscriptionId?: string | null, customerId?: string | null) {
  if (subscriptionId) {
    return db.user.findUnique({ where: { razorpaySubscriptionId: subscriptionId } })
  }
  if (customerId) {
    return db.user.findUnique({ where: { razorpayCustomerId: customerId } })
  }
  return Promise.resolve(null)
}

function periodEndDate(seconds?: number | null): Date | undefined {
  return seconds ? new Date(seconds * 1000) : undefined
}

async function handleSubscriptionPayment(
  subscriptionId: string,
  customerId: string,
  planId: string,
  periodEndSeconds?: number | null,
) {
  let user = await findUserBySubscription(subscriptionId, customerId)

  let resolvedPlanId = planId
  let resolvedPeriodEnd = periodEndSeconds

  if (!user && customerId) {
    const subscription = await getRazorpay().subscriptions.fetch(subscriptionId)
    const notes = subscription.notes as Record<string, unknown> | undefined
    const noteUserId = notes?.userId ? String(notes.userId) : null
    user = noteUserId ? await db.user.findUnique({ where: { id: noteUserId } }) : null
    resolvedPlanId = subscription.plan_id || planId
    resolvedPeriodEnd = subscription.current_period_end ?? periodEndSeconds
  }

  if (!user) {
    console.warn(`[Razorpay Webhook] No user found for subscription ${subscriptionId}`)
    return
  }

  const plan = getPlanByRazorpayPlanId(resolvedPlanId)
  const periodEnd = periodEndDate(resolvedPeriodEnd)

  if (user.razorpaySubscriptionId === subscriptionId) {
    await paymentService.renew(user.id, 'razorpay', periodEnd)
  } else {
    await paymentService.activatePlan({
      userId: user.id,
      plan: plan?.id ?? 'FREELANCER',
      provider: 'razorpay',
      customerId,
      subscriptionId,
      priceId: resolvedPlanId,
      periodEnd,
    })
  }
}

async function handleOneTimeOrder(orderId: string) {
  const order = await getRazorpay().orders.fetch(orderId)
  const notes = (order.notes ?? {}) as Record<string, unknown>
  const userId = notes.userId ? String(notes.userId) : null
  if (!userId) {
    console.warn(`[Razorpay Webhook] Order ${orderId} has no userId note`)
    return
  }

  const planId = notes.plan ? String(notes.plan) : null
  if (planId) {
    await paymentService.activatePlan({
      userId,
      plan: planId,
      provider: 'razorpay',
      priceId: planId,
    })
    return
  }

  console.warn(`[Razorpay Webhook] Order ${orderId} has unknown notes`, notes)
}

async function handleSubscriptionInactive(
  subscriptionId: string,
  customerId?: string | null,
) {
  const user = await findUserBySubscription(subscriptionId, customerId)
  if (!user) {
    console.warn(`[Razorpay Webhook] No user found for inactive subscription ${subscriptionId}`)
    return
  }
  await paymentService.cancel(user.id, 'razorpay')
}

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  if (!signature) {
    return new NextResponse('Missing x-razorpay-signature header', { status: 400 })
  }

  let secret: string
  try {
    secret = getRazorpayWebhookSecret()
  } catch (err: any) {
    console.error(`[Razorpay Webhook] ${err.message}`)
    return new NextResponse('Razorpay Webhook Secret not configured', { status: 500 })
  }

  if (!verifyRazorpaySignature(body, signature, secret)) {
    console.error('[Razorpay Webhook] Signature verification failed')
    return new NextResponse('Webhook signature verification failed', { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch (err: any) {
    console.error(`[Razorpay Webhook] Invalid JSON body: ${err.message}`)
    return new NextResponse('Invalid webhook body', { status: 400 })
  }

  const eventId = event?.id
  const eventType = event?.event
  if (!eventId || !eventType) {
    return new NextResponse('Invalid webhook payload', { status: 400 })
  }

  if (await isEventProcessed(eventId)) {
    return new NextResponse('Webhook processed successfully (duplicate)', { status: 200 })
  }

  try {
    const payload = event.payload ?? {}
    const payment = (payload.payment?.entity ?? {}) as RazorpayEntity
    const subscription = (payload.subscription?.entity ?? {}) as RazorpayEntity

    switch (eventType) {
      case 'payment.captured': {
        if (payment.subscription_id) {
          await handleSubscriptionPayment(
            payment.subscription_id,
            payment.customer_id ?? subscription.customer_id ?? '',
            subscription.plan_id ?? payment.plan_id ?? '',
            subscription.current_period_end ?? payment.current_period_end,
          )
        } else if (payment.order_id) {
          await handleOneTimeOrder(payment.order_id)
        } else {
          console.warn('[Razorpay Webhook] payment.captured without subscription or order')
        }
        break
      }

      case 'subscription.charged': {
        await handleSubscriptionPayment(
          subscription.id,
          subscription.customer_id ?? payment.customer_id ?? '',
          subscription.plan_id ?? '',
          subscription.current_period_end,
        )
        break
      }

      case 'subscription.cancelled':
      case 'subscription.completed':
      case 'subscription.halted':
      case 'subscription.paused': {
        await handleSubscriptionInactive(subscription.id, subscription.customer_id)
        break
      }

      default:
        console.log(`[Razorpay Webhook] Unhandled event type: ${eventType}`)
    }

    await markEventProcessed(eventId, eventType)
  } catch (err: any) {
    console.error(`[Razorpay Webhook] Error processing event: ${err.message}`)
    return new NextResponse('Webhook processing failed', { status: 500 })
  }

  return new NextResponse('Webhook processed successfully', { status: 200 })
}
