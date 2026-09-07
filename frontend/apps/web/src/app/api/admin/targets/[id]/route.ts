import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { getTarget, updateTarget, deleteTarget } from '@/lib/external-api/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const result = await getTarget(id)
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Target not found'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 404 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const result = await updateTarget(id, {
      name: body.name !== undefined ? body.name.trim() : undefined,
      notes: body.notes !== undefined ? (body.notes.trim() || null) : undefined,
      is_active: body.is_active,
      platform: body.platform,
      url: body.url !== undefined ? body.url.trim() : undefined,
    })
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to update target'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    await deleteTarget(id)
    return NextResponse.json({ success: true, data: {} })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to delete target'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}