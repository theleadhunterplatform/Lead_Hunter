import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError, AuthRequiredError } from '@/lib/auth'
import { createApifyKey, deleteApifyKey, getApifyKeys } from '@/lib/external-api/client'
import { db } from '@/lib/db'

import { parseApifyTokens, type ParsedApifyToken } from '@/lib/apify-token-parser'

export const dynamic = 'force-dynamic'

type BulkApifyItem = ParsedApifyToken

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()

    let items: BulkApifyItem[] = []
    if (Array.isArray(body.items) && body.items.length > 0) {
      items = body.items.map((it: any) => ({
        key: String(it.key || '').trim(),
        label: it.label ? String(it.label).trim() : undefined,
      })).filter((it: BulkApifyItem) => !!it.key)
    } else if (typeof body.rawText === 'string' && body.rawText.trim()) {
      items = parseApifyTokens(body.rawText)
    }

    if (items.length === 0) {
      return NextResponse.json(
        { code: 'BAD_REQUEST', message: 'No valid Apify tokens found in input' },
        { status: 400 },
      )
    }

    const month = new Date().toISOString().slice(0, 7)
    let addedCount = 0
    let skippedCount = 0
    let flaggedCount = 0
    const errors: Array<{ key: string; label?: string; error: string }> = []

    for (const item of items) {
      const rawKey = item.key
      const label = item.label || null

      // Live verification with Apify
      let isValid = true
      let apifyError: string | null = null
      try {
        const apifyRes = await fetch('https://api.apify.com/v2/users/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${rawKey}` },
        })
        if (!apifyRes.ok) {
          const errJson = await apifyRes.json().catch(() => ({}))
          apifyError = errJson?.error?.message || errJson?.message || `HTTP ${apifyRes.status}`
          isValid = false
          flaggedCount++
          errors.push({ key: rawKey, label: label || undefined, error: apifyError })
        }
      } catch (err: any) {
        console.warn(`[Bulk Apify Keys] Apify live ping error for ${label || rawKey}:`, err.message)
        apifyError = err.message || 'Network error verifying key'
        isValid = false
        flaggedCount++
        errors.push({ key: rawKey, label: label || undefined, error: apifyError })
      }

      // Attempt creation on external VPS API (catch 400/429 so local DB save still succeeds)
      try {
        await createApifyKey({ key: rawKey, label })
      } catch (externalErr: any) {
        console.warn(`[Bulk Apify Keys] External API notice for ${label || rawKey}:`, externalErr.message)
      }

      // Save to database (persists BOTH valid and problematic tokens)
      try {
        await db.apifyKey.upsert({
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
        addedCount++
      } catch (dbErr: any) {
        console.error(`[Bulk Apify Keys] Failed to save key in DB:`, dbErr)
        errors.push({ key: rawKey, label: label || undefined, error: 'Database save failed' })
      }
    }

    const summaryMsg = flaggedCount > 0
      ? `Added all ${addedCount} token(s). ${addedCount - flaggedCount} active, ${flaggedCount} flagged with errors.`
      : `Successfully added and verified all ${addedCount} token(s)!`

    return NextResponse.json({
      success: true,
      addedCount,
      skippedCount,
      flaggedCount,
      errorsCount: errors.length,
      errors,
      message: summaryMsg,
    })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    const msg = error instanceof Error ? error.message : 'Bulk import failed'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json().catch(() => ({}))
    const isDeleteAll = Boolean(body?.all)
    let ids: string[] = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : []

    if (isDeleteAll) {
      // 1. Delete all keys in external VPS backend
      try {
        const allRes = await getApifyKeys()
        const vpsIds = (allRes.data || []).map((k) => k.id).filter(Boolean)
        await Promise.allSettled(vpsIds.map((id) => deleteApifyKey(id)))
      } catch (vpsErr: any) {
        console.warn('[Bulk Apify Keys] External VPS bulk delete notice:', vpsErr.message)
      }

      // 2. Hard delete all keys from Supabase database
      const deletedResult = await db.apifyKey.deleteMany({})

      return NextResponse.json({
        success: true,
        deletedCount: deletedResult.count,
        message: `Successfully deleted all ${deletedResult.count} Apify key(s) from database`,
      })
    }

    if (ids.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0, message: 'No keys to delete' })
    }

    // Delete specific keys in external VPS API (run concurrently)
    await Promise.allSettled(ids.map((id) => deleteApifyKey(id)))

    // Hard delete specified keys from Supabase database
    const deletedResult = await db.apifyKey.deleteMany({
      where: { id: { in: ids } },
    })

    return NextResponse.json({
      success: true,
      deletedCount: deletedResult.count,
      message: `Successfully deleted ${deletedResult.count} Apify key(s)`,
    })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    const msg = error instanceof Error ? error.message : 'Bulk delete failed'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
