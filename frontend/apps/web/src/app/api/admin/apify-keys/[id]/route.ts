import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { getApifyKeys, deleteApifyKey } from '@/lib/external-api/client'
import { db } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    
    // Check DB first
    const dbKey = await db.apifyKey.findFirst({
      where: { OR: [{ id }, { key: id }] },
    })

    if (dbKey) {
      return NextResponse.json({ success: true, data: { ...dbKey, _id: dbKey.id } })
    }

    // Check external VPS
    const result = await getApifyKeys().catch(() => ({ data: [] }))
    const item = (result.data || []).find((k) => k.id === id || k.key === id)
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

    // 1. Find key in DB to know the key string
    const existingDbKey = await db.apifyKey.findFirst({
      where: { OR: [{ id }, { key: id }] },
    }).catch(() => null)

    const keyString = existingDbKey?.key || (id.startsWith('apify_api_') ? id : null)

    // 2. Delete from external VPS API
    try {
      await deleteApifyKey(id)
    } catch (e: any) {
      // If direct id failed, try finding by key string on VPS
      if (keyString) {
        try {
          const vpsKeys = await getApifyKeys()
          const matched = (vpsKeys.data || []).find((k) => k.key === keyString)
          if (matched?.id) {
            await deleteApifyKey(matched.id)
          }
        } catch {}
      }
    }

    // 3. Delete from database (hard delete by both ID and key)
    const deleteConditions: Array<{ id: string } | { key: string }> = [{ id }]
    if (keyString) {
      deleteConditions.push({ key: keyString })
    }

    const deletedResult = await db.apifyKey.deleteMany({
      where: { OR: deleteConditions },
    })

    return NextResponse.json({
      success: true,
      deletedCount: deletedResult.count,
      data: {},
    })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to delete Apify key'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}