import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { createKeyword, deleteKeyword } from '@/lib/external-api/client'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const texts: string[] = body.texts || []
    const platforms: string[] = body.platforms || ['linkedin']
    const results = []
    for (const text of texts) {
      if (!text.trim()) continue
      try {
        const res = await createKeyword({ text: text.trim(), platforms })
        results.push(res.data)
      } catch {
        // skip duplicates / existing
      }
    }
    return NextResponse.json({ success: true, count: results.length, data: results }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to add keywords'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const { ids } = body
    let updated = 0
    for (const id of ids || []) {
      try {
        await deleteKeyword(id)
        updated++
      } catch {
        // skip
      }
    }
    return NextResponse.json({ success: true, data: {}, updated })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to update keywords'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const { ids } = body
    for (const id of ids || []) {
      try {
        await deleteKeyword(id)
      } catch {
        // skip
      }
    }
    return NextResponse.json({ success: true, data: {} })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to delete keywords'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}