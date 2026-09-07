import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireEmailVerified, AuthRequiredError, EmailNotVerifiedError } from '@/lib/auth'
import { onboardingSchema } from '@/lib/validators/auth'
import { emailService } from '@/lib/services/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireEmailVerified(request)
    if (!authUser) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const parsed = onboardingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid onboarding data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const hasAnyLink =
      parsed.data.portfolio ||
      parsed.data.website ||
      parsed.data.linkedin ||
      parsed.data.instagram ||
      parsed.data.dribbble ||
      parsed.data.behance ||
      parsed.data.github ||
      parsed.data.twitter
    if (!hasAnyLink) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'At least one profile link is required' },
        { status: 400 },
      )
    }

    const existingUser = await db.user.findUnique({ where: { id: authUser.uid } })
    if (!existingUser) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'User not found. Create an account first.' },
        { status: 404 },
      )
    }

    const isAdmin = existingUser.role === 'admin'
    const updatedUser = await db.user.update({
      where: { id: authUser.uid },
      data: {
        ...parsed.data,
        status: isAdmin ? existingUser.status : 'PENDING',
      },
    })

    emailService.sendApplicationReceived({ name: updatedUser.name, email: updatedUser.email })
    emailService.sendOnboardingComplete({ name: updatedUser.name, email: updatedUser.email })
    emailService.notifyAdmin('New Application', {
      name: updatedUser.name,
      email: updatedUser.email,
      id: updatedUser.id,
    })

    return NextResponse.json({
      data: {
        id: updatedUser.id,
        status: updatedUser.status,
      },
    })
  } catch (error) {
    if (error instanceof EmailNotVerifiedError) {
      return NextResponse.json(
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before continuing' },
        { status: 403 },
      )
    }
    if (error instanceof AuthRequiredError) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    console.error('[Onboarding API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}
