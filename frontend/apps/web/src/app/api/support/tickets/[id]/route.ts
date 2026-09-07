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

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const authUser = await getAuthForTicket(request)
    const isAdmin = authUser.isAdmin

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          where: isAdmin ? {} : { isInternal: false },
        },
        user: { select: { name: true, email: true } },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Ticket not found' },
        { status: 404 },
      )
    }

    if (!isAdmin && ticket.userId !== authUser.uid) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'You do not have access to this ticket' },
        { status: 403 },
      )
    }

    return NextResponse.json({ data: ticket })
  } catch (error: unknown) {
    return handleAuthErrors(error, 'Failed to load ticket')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authUser = await getAuthForTicket(request)
    const isAdmin = authUser.isAdmin
    const body = await request.json()

    const ticket = await db.supportTicket.findUnique({ where: { id } })
    if (!ticket) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Ticket not found' },
        { status: 404 },
      )
    }

    if (isAdmin) {
      const { status, priority, assigneeId } = body
      const data: Record<string, unknown> = {}
      if (status !== undefined) data.status = status
      if (priority !== undefined) data.priority = priority
      if (assigneeId !== undefined) data.assigneeId = assigneeId
      if (Object.keys(data).length === 0) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'No fields to update' },
          { status: 400 },
        )
      }
      const updated = await db.supportTicket.update({ where: { id }, data })
      return NextResponse.json({ success: true, data: updated })
    }

    // Non-admin: may only close their own OPEN ticket
    if (ticket.userId !== authUser.uid) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'You do not have access to this ticket' },
        { status: 403 },
      )
    }
    const { state } = body // { state: 'CLOSED' } to close
    if (state === 'CLOSED') {
      const updated = await db.supportTicket.update({
        where: { id },
        data: { status: 'CLOSED', resolvedAt: new Date() },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid update' },
      { status: 400 },
    )
  } catch (error: unknown) {
    return handleAuthErrors(error, 'Failed to update ticket')
  }
}

/**
 * Resolves auth as either a fully-authorized user or an admin, returning
 * whether the requester is an admin while preserving the original behavior.
 */
async function getAuthForTicket(request: NextRequest): Promise<{
  uid: string
  isAdmin: boolean
}> {
  try {
    const admin = await requireAdmin(request)
    return { uid: admin.uid, isAdmin: true }
  } catch (e) {
    const user = await requireFullyAuthorized(request)
    return { uid: user.uid, isAdmin: false }
  }
}

function handleAuthErrors(
  error: unknown,
  defaultMessage: string,
): NextResponse {
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
  console.error('[Support Ticket] error:', error)
  return NextResponse.json(
    { code: 'INTERNAL_SERVER_ERROR', message: defaultMessage },
    { status: 500 },
  )
}