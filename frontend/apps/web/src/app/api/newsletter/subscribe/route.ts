import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { subscribeSchema } from '@/lib/validators/newsletter'
import { emailService } from '@/lib/services/email'
import { randomUUID } from 'crypto'
import { rateLimitByKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitByKey(`newsletter:${ip}`, 5, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Too many subscription requests. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await request.json().catch(() => null)
    // Honeypot check: Bots fill hidden fields
    if (body?.hp_website_check) {
      return NextResponse.json({ success: true, message: 'Subscribed' }, { status: 200 })
    }

    const parsed = subscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid email' },
        { status: 400 },
      )
    }
    const email = parsed.data.email
    const source = parsed.data.source || 'landing'

    const existing = await db.newsletterSubscriber.findUnique({ where: { email } })
    const unsubscribeToken = randomUUID()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadhunterclub.com'

    let subscriber
    if (existing) {
      subscriber = await db.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { status: 'SUBSCRIBED', unsubscribeToken, source },
      })
    } else {
      subscriber = await db.newsletterSubscriber.create({
        data: { email, status: 'SUBSCRIBED', unsubscribeToken, source },
      })
    }

    const confirmUrl = `${appUrl}/newsletter/confirm?email=${encodeURIComponent(email)}&token=${unsubscribeToken}`
    void emailService
      .sendNewsletterConfirmation(email, confirmUrl)
      .catch((e) => console.error('[Newsletter] confirmation failed:', e))

    return NextResponse.json({ success: true, data: { email, status: subscriber.status } })
  } catch (error: unknown) {
    console.error('[Newsletter Subscribe] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to subscribe' },
      { status: 500 },
    )
  }
}