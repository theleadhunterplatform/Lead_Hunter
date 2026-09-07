import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireFullyAuthorized,
  AuthRequiredError,
  InactiveUserError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
} from '@/lib/auth'
import { outreachSendSchema } from '@/lib/validators/auth'
import { rateLimitByKey } from '@/lib/rate-limit'
import { creditService, InsufficientCreditsError } from '@/lib/services/credits'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitByKey(`user:${userId}:send`, 10, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        { status: 429 },
      )
    }

    const raw = await request.json()
    const parsed = outreachSendSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { leadId, subject, body } = parsed.data

    const SEND_COST = 1
    await creditService.deduct(userId, SEND_COST, 'outreach_send', { leadId, subject })

    const userState = await db.userLeadState.upsert({
      where: {
        userId_leadId: {
          userId,
          leadId,
        },
      },
      update: {
        status: 'sent',
      },
      create: {
        userId,
        leadId,
        status: 'sent',
        isSaved: true,
      },
    })

    const email = await db.emailMessage.create({
      data: {
        userLeadStateId: userState.id,
        subject,
        body,
        direction: 'outbound',
      },
    })

    return NextResponse.json({ success: true, data: email })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    if (error instanceof InactiveUserError) {
      return NextResponse.json(
        { code: 'INACTIVE', message: 'Your account is not active' },
        { status: 403 },
      )
    }
    if (error instanceof EmailNotVerifiedError) {
      return NextResponse.json(
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before continuing' },
        { status: 403 },
      )
    }
    if (error instanceof OnboardingRequiredError) {
      return NextResponse.json(
        { code: 'ONBOARDING_REQUIRED', message: 'Please complete onboarding first' },
        { status: 403 },
      )
    }
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient credits to send outreach',
          required: error.required,
        },
        { status: 400 },
      )
    }
    console.error('[Send API Error]', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to send email' },
      { status: 500 },
    )
  }
}
