import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError, AuthRequiredError } from '@/lib/auth'
import { getApifyKeys, createApifyKey, ExternalApiError } from '@/lib/external-api/client'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    // Fetch from external VPS API
    let externalKeys: any[] = []
    try {
      const result = await getApifyKeys()
      externalKeys = result.data || []
    } catch (extErr: any) {
      console.warn('[Admin Apify Keys] Failed to fetch external keys, using local DB:', extErr.message)
    }

    // Fetch from database
    const dbKeys = await db.apifyKey.findMany({
      where: { is_deleted: false },
      orderBy: { created_at: 'desc' },
    })

    const extByKey = new Map(externalKeys.map((k) => [k.key, k]))
    const seenKeys = new Set<string>()
    const merged: any[] = []

    for (const dbKey of dbKeys) {
      seenKeys.add(dbKey.key)
      const ext = extByKey.get(dbKey.key)
      const isExhausted = Boolean(
        ext?.platform_usage?.remaining === 0 ||
        ext?.usage?.status === 'exhausted' ||
        ext?.comments_remaining === 0 ||
        (ext && !ext.is_active && !dbKey.error_message)
      )

      merged.push({
        _id: dbKey.id,
        id: dbKey.id,
        key: dbKey.key,
        label: dbKey.label || ext?.label || null,
        is_active: dbKey.is_active && !isExhausted && (ext ? ext.is_active : true),
        is_exhausted: isExhausted,
        error_message: dbKey.error_message || ext?.error_message || null,
        comments_used: ext?.comments_used ?? dbKey.comments_used,
        comments_limit: ext?.comments_limit ?? dbKey.comments_limit,
        comments_remaining: isExhausted ? 0 : (ext?.comments_remaining ?? Math.max(0, (dbKey.comments_limit || 1000) - dbKey.comments_used)),
        assigned_worker: ext?.assigned_worker || null,
        usage: ext?.usage || null,
        platform_usage: ext?.platform_usage || null,
        created_at: dbKey.created_at,
      })
    }

    for (const ext of externalKeys) {
      if (!seenKeys.has(ext.key)) {
        merged.push({
          ...ext,
          _id: ext.id,
          error_message: ext.error_message || null,
        })
      }
    }

    return NextResponse.json({
      success: true,
      count: merged.length,
      data: merged,
    })
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

    // 0. Live verification against Apify API before saving
    let isValid = true
    let apifyError: string | null = null
    try {
      const apifyRes = await fetch('https://api.apify.com/v2/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${rawKey}`,
        },
      })
      if (!apifyRes.ok) {
        const errJson = await apifyRes.json().catch(() => ({}))
        apifyError = errJson?.error?.message || errJson?.message || `HTTP ${apifyRes.status}`
        isValid = false
      }
    } catch (networkErr: any) {
      console.warn('[Admin Apify Keys] Apify live validation network error:', networkErr)
      apifyError = networkErr?.message || 'Network error verifying key'
      isValid = false
    }

    // 1. Create on external API (VPS backend)
    try {
      await createApifyKey({ key: rawKey, label })
    } catch (extErr: any) {
      console.warn('[Admin Apify Keys] External API notice:', extErr.message)
    }

    // 2. Save to database (persists both valid and problematic tokens)
    const month = new Date().toISOString().slice(0, 7)
    const savedKey = await db.apifyKey.upsert({
      where: { key: rawKey },
      create: {
        key: rawKey,
        label,
        usage_month: month,
        comments_limit: 2500,
        is_active: isValid,
        is_deleted: false,
        error_message: isValid ? null : apifyError,
      },
      update: {
        is_active: isValid,
        is_deleted: false,
        label: label || undefined,
        error_message: isValid ? null : apifyError,
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...savedKey, _id: savedKey.id },
      flagged: !isValid,
      message: isValid
        ? 'Apify key added and verified successfully'
        : `Token added with warning: ${apifyError}`,
    }, { status: 201 })
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