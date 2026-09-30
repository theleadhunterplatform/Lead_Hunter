import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError, AuthRequiredError } from '@/lib/auth'
import { getApifyKeys, createApifyKey, ExternalApiError } from '@/lib/external-api/client'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const result = await getApifyKeys()
    const mapped = {
      ...result,
      data: (result.data || []).map((k) => ({ ...k, _id: k.id })),
    }
    return NextResponse.json(mapped)
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch Apify keys'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const rawKey = body?.key?.trim()
    if (!rawKey) {
      return NextResponse.json({ code: 'BAD_REQUEST', message: 'API key is required' }, { status: 400 })
    }

    const label = body.label?.trim() || null

    // 1. Create on external API (VPS backend)
    const result = await createApifyKey({ key: rawKey, label })

    // 2. Also sync to local Supabase apify_keys table for status tracking
    try {
      const month = new Date().toISOString().slice(0, 7)
      await db.apifyKey.upsert({
        where: { key: rawKey },
        create: {
          key: rawKey,
          label,
          usage_month: month,
          comments_limit: 2500,
          is_active: true,
          is_deleted: false,
        },
        update: {
          is_active: true,
          is_deleted: false,
          label: label || undefined,
        },
      })
    } catch (syncErr) {
      console.warn('[Admin Apify Keys] Notice: Supabase sync skipped:', syncErr)
    }

    return NextResponse.json({ success: true, data: { ...result.data, _id: result.data.id } }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof ExternalApiError) {
      return NextResponse.json(
        { code: 'EXTERNAL_ERROR', message: error.externalMessage || error.message },
        { status: error.status || 400 },
      )
    }
    const msg = error instanceof Error ? error.message : 'Failed to save Apify key'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}