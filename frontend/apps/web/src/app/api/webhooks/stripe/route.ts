import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { paymentService } from '@/lib/services/payment'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required')
  }
  return new Stripe(key, { apiVersion: '2024-04-10' as any })
}

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET
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
      targetType: 'STRIPE_EVENT',
      targetId: eventId,
      details: { eventType },
    },
  })
}

export async function POST(req: Request) {
  const body = await req.text()
  const headerList = headers()
  const signature = headerList.get('stripe-signature')

  if (!signature) {
    return new NextResponse('Missing stripe-signature header', { status: 400 })
  }

  const webhookSecret = getWebhookSecret()
  if (!webhookSecret) {
    console.error('[Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET.')
    return new NextResponse('Stripe Webhook Secret not configured', { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`)
    return new NextResponse('Webhook signature verification failed', { status: 400 })
  }

  const alreadyProcessed = await isEventProcessed(event.id)
  if (alreadyProcessed) {
    return new NextResponse('Webhook processed successfully (duplicate)', { status: 200 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (!userId) {
          console.warn(
            '[Stripe Webhook] checkout.session.completed received without client_reference_id',
          )
          break
        }

        const subscription = (await getStripe().subscriptions.retrieve(subscriptionId)) as any
        const priceId = subscription.items.data[0]?.price.id
        const plan = 'FREELANCER'

        await paymentService.activatePlan({
          userId,
          plan,
          provider: 'stripe',
          customerId,
          subscriptionId,
          priceId,
          periodEnd: new Date(subscription.current_period_end * 1000),
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const subscription = (await getStripe().subscriptions.retrieve(subscriptionId)) as any
          const user = await db.user.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
          })

          if (user) {
            await paymentService.renew(user.id, 'stripe', new Date(subscription.current_period_end * 1000))
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const user = await db.user.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        })

        if (user) {
          const isActive = subscription.status === 'active' || subscription.status === 'trialing'
          await db.user.update({
            where: { id: user.id },
            data: {
              plan: isActive ? user.plan : 'FREE',
              stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const user = await db.user.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        })

        if (user) {
          await paymentService.cancel(user.id, 'stripe')
        }
        break
      }
    }

    await markEventProcessed(event.id, event.type)
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error processing event: ${err.message}`)
    return new NextResponse('Webhook processing failed', { status: 500 })
  }

  return new NextResponse('Webhook processed successfully', { status: 200 })
}
