import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { getKeywords, updateKeyword, deleteKeyword } from '@/lib/external-api/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const result = await getKeywords()
    const item = result.data.find((k) => k.id === id) || result.data.find((k) => (k as unknown as Record<string, unknown>)._id === id)
    if (!item) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Keyword not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Keyword not found'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 404 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const result = await updateKeyword(id, {
      text: body.text !== undefined ? body.text.trim() : undefined,
      platforms: body.platforms,
      is_active: body.is_active,
    })
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to update keyword'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    await deleteKeyword(id)
    return NextResponse.json({ success: true, data: {} })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to delete keyword'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}