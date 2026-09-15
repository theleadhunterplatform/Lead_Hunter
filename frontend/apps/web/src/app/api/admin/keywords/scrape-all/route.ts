import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { triggerAllScrapers } from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const result = await triggerAllScrapers()
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to trigger scrape for all keywords'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
