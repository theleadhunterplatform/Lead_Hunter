import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { getApifyKeys, deleteApifyKey } from '@/lib/external-api/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const result = await getApifyKeys()
    const item = result.data.find((k) => k.id === id)
    if (!item) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Apify key not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: { ...item, _id: item.id } })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Apify key not found'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 404 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    await deleteApifyKey(id)
    return NextResponse.json({ success: true, data: {} })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to delete Apify key'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}