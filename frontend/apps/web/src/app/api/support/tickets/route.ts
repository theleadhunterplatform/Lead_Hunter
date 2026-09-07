import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireFullyAuthorized,
  AuthRequiredError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
  InactiveUserError,
} from '@/lib/auth'
import { emailService } from '@/lib/services/email'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const tickets = await db.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        subject: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    })

    return NextResponse.json({
      data: tickets,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
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
    if (error instanceof InactiveUserError) {
      return NextResponse.json(
        { code: 'INACTIVE', message: 'Your account is not active' },
        { status: 403 },
      )
    }
    console.error('[Support Tickets] GET error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to load support tickets' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const body = await request.json()
    const { subject, category, priority, firstMessage } = body
    if (!subject || !firstMessage) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Subject and first message are required' },
        { status: 400 },
      )
    }

    const ticket = await db.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          userId,
          subject,
          category: category || 'general',
          priority: priority || 'normal',
        },
      })
      await tx.supportTicketMessage.create({
        data: {
          ticketId: created.id,
          authorId: userId,
          authorRole: 'user',
          body: firstMessage,
        },
      })
      return created
    })

    const user = await db.user.findUnique({ where: { id: userId } })

    void emailService
      .notifyAdmin('New Support Ticket', {
        subject,
        category: category || 'general',
        from: user?.name || authUser.name || userId,
        email: user?.email || authUser.email || '',
        ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadhunterclub.com'}/admin/support/${ticket.id}`,
      })
      .catch((e) => console.error('[Support] notifyAdmin failed:', e))

    return NextResponse.json({ success: true, data: ticket }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
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
    if (error instanceof InactiveUserError) {
      return NextResponse.json(
        { code: 'INACTIVE', message: 'Your account is not active' },
        { status: 403 },
      )
    }
    console.error('[Support Tickets] POST error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create support ticket' },
      { status: 500 },
    )
  }
}