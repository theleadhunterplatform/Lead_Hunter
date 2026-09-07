import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { getTargets, scrapeAllTargets } from '@/lib/external-api/client'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const targets = await getTargets()
    const activeTargets = targets.data.filter((t) => t.is_active)
    if (activeTargets.length === 0) {
      return NextResponse.json(
        { code: 'BAD_REQUEST', message: 'No active watchlist targets to scrape.' },
        { status: 400 },
      )
    }
    const result = await scrapeAllTargets()
    return NextResponse.json({ success: true, message: result.message, count: activeTargets.length })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to queue targets'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}