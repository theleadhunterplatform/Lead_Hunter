import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireFullyAuthorized,
  requireAdmin,
  AuthRequiredError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
  InactiveUserError,
  ForbiddenError,
} from '@/lib/auth'
import { emailService } from '@/lib/services/email'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await params
    const body = await request.json()
    const { body: messageBody, isInternal } = body

    if (!messageBody) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Message body is required' },
        { status: 400 },
      )
    }

    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!ticket) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Ticket not found' },
        { status: 404 },
      )
    }

    // Resolve requester and role
    let authorId = ''
    let authorRole: 'user' | 'admin' = 'user'
    let isAdmin = false
    try {
      const admin = await requireAdmin(request)
      authorId = admin.uid
      authorRole = 'admin'
      isAdmin = true
    } catch {
      const user = await requireFullyAuthorized(request)
      if (ticket.userId !== user.uid) {
        return NextResponse.json(
          { code: 'FORBIDDEN', message: 'You do not have access to this ticket' },
          { status: 403 },
        )
      }
      authorId = user.uid
      authorRole = 'user'
    }

    const msgIsInternal = !!isInternal && isAdmin

    const message = await db.supportTicketMessage.create({
      data: {
        ticketId,
        authorId,
        authorRole,
        body: messageBody,
        isInternal: msgIsInternal,
      },
    })

    // If user replies to a closed ticket, reopen it
    if (authorRole === 'user' && ticket.status === 'CLOSED') {
      await db.supportTicket.update({ where: { id: ticketId }, data: { status: 'OPEN' } })
    }

    // Notify the other party via email
    if (authorRole === 'admin' && ticket.user.email) {
      void emailService
        .sendTicketReply({
          name: ticket.user.name,
          email: ticket.user.email,
          ticketSubject: ticket.subject,
          replyBody: messageBody,
          ticketUrl: ticketUrl(ticketId),
        })
        .catch((e) => console.error('[Support] notify user failed:', e))
    } else if (authorRole === 'user') {
      void emailService
        .notifyAdmin('New Support Reply', {
          ticket: ticket.subject,
          ticketUrl: ticketUrl(ticketId),
        })
        .catch((e) => console.error('[Support] notify admin failed:', e))
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 })
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
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 },
      )
    }
    console.error('[Support Messages] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to send message' },
      { status: 500 },
    )
  }
}

function ticketUrl(id: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://leadhunterclub.com'
  return `${base}/support/${id}`
}