import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { getTargets, createTarget } from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const result = await getTargets()
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch targets'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const result = await createTarget({
      name: body.name.trim(),
      url: body.url.trim(),
      platform: body.platform || 'linkedin',
      notes: body.notes?.trim() || null,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to create target'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}