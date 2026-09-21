import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireFullyAuthorized,
  AuthRequiredError,
  InactiveUserError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
} from '@/lib/auth'
import { createLeadSheet, appendToSheet, type SheetLeadRow } from '@/lib/services/sheets'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { googleSheetId: true },
    })

    const states = await db.userLeadState.findMany({
      where: { userId, isSaved: true },
      include: { lead: true },
    })

    const rows: SheetLeadRow[] = []
    for (const s of states) {
      if (!s.lead) {
        console.warn(`[Sheets Export] Skipping state ${s.leadId}: no Lead record`)
        continue
      }
      rows.push({
        name: s.lead.name,
        email: s.lead.email,
        phone: s.lead.phone || '',
        company: s.lead.company,
        signalContext: s.lead.signalContext,
        aiDraft: '',
        status: s.status.charAt(0).toUpperCase() + s.status.slice(1),
        urgency: s.lead.urgency.charAt(0).toUpperCase() + s.lead.urgency.slice(1),
        replyProbability: s.lead.replyProbability,
      })
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { code: 'NO_LEADS', message: 'No saved leads with complete data to export' },
        { status: 400 },
      )
    }

    let sheetUrl: string

    if (user?.googleSheetId) {
      await appendToSheet(user.googleSheetId, rows)
      sheetUrl = `https://docs.google.com/spreadsheets/d/${user.googleSheetId}`
    } else {
      sheetUrl = await createLeadSheet(rows)

      const match = sheetUrl.match(/\/d\/([^/]+)/)
      if (match) {
        await db.user.update({
          where: { id: userId },
          data: { googleSheetId: match[1] },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: { sheetUrl, count: rows.length },
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
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[Sheets Export] Error:', errMsg)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: `Failed to export to Google Sheets: ${errMsg}` },
      { status: 500 },
    )
  }
}
