import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireFullyAuthorized, AuthRequiredError, InactiveUserError, EmailNotVerifiedError, OnboardingRequiredError } from '@/lib/auth'
import { syncFromSheet } from '@/lib/services/sheets'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { googleSheetId: true },
    })

    if (!user?.googleSheetId) {
      return NextResponse.json(
        { code: 'NO_SHEET', message: 'No Google Sheet connected. Export first.' },
        { status: 400 },
      )
    }

    const statusUpdates = await syncFromSheet(user.googleSheetId)

    let updatedCount = 0
    for (const update of statusUpdates) {
      if (!update.email) continue

      const normalizedStatus = update.status.toLowerCase()
      const validStatuses = ['saved', 'sent', 'replied', 'follow-up']
      if (!validStatuses.includes(normalizedStatus)) continue

      const state = await db.userLeadState.findFirst({
        where: {
          userId,
          lead: { email: update.email },
          isSaved: true,
        },
      })

      if (state && state.status !== normalizedStatus) {
        await db.userLeadState.update({
          where: { id: state.id },
          data: { status: normalizedStatus },
        })
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      data: { updatedCount },
    })
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
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address first' },
        { status: 403 },
      )
    }
    if (error instanceof OnboardingRequiredError) {
      return NextResponse.json(
        { code: 'ONBOARDING_REQUIRED', message: 'Please complete onboarding first' },
        { status: 403 },
      )
    }
    console.error('[Sheets Sync] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to sync from Google Sheets' },
      { status: 500 },
    )
  }
}
