import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { getApifyKeys, createApifyKey } from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const result = await getApifyKeys()
    const mapped = {
      ...result,
      data: result.data.map((k) => ({ ...k, _id: k.id })),
    }
    return NextResponse.json(mapped)
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch Apify keys'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const result = await createApifyKey({ key: body.key.trim(), label: body.label?.trim() || null })
    return NextResponse.json({ success: true, data: { ...result.data, _id: result.data.id } }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to save Apify key'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}