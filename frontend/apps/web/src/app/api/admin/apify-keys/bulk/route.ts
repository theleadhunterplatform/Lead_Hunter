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
        const vpsIds = (allRes.data || []).map((k: any) => k.id || k._id).filter(Boolean)
        await Promise.allSettled(vpsIds.map((id: string) => deleteApifyKey(id)))
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

    // 1. Resolve all keys in DB to find actual key strings and DB IDs
    const dbKeys = await db.apifyKey.findMany({
      where: {
        OR: [
          { id: { in: ids } },
          { key: { in: ids } },
        ],
      },
      select: { id: true, key: true },
    }).catch(() => [])

    const keyStrings = new Set<string>()
    const dbIds = new Set<string>(ids)
    for (const k of dbKeys) {
      if (k.key) keyStrings.add(k.key)
      if (k.id) dbIds.add(k.id)
    }
    for (const id of ids) {
      if (id.startsWith('apify_api_')) keyStrings.add(id)
    }

    // 2. Fetch external VPS keys and match corresponding VPS IDs
    const vpsIdsToDelete = new Set<string>(ids)
    try {
      const vpsRes = await getApifyKeys()
      const externalKeys = vpsRes.data || []
      for (const ext of externalKeys) {
        const extKey = ext.key
        const extId = ext.id || (ext as any)._id
        if (keyStrings.has(extKey) || ids.includes(extId)) {
          if (extId) vpsIdsToDelete.add(extId)
          if (extKey) keyStrings.add(extKey)
        }
      }
    } catch (vpsErr: any) {
      console.warn('[Bulk Apify Keys] Failed to fetch VPS keys for deletion matching:', vpsErr.message)
    }

    // 3. Delete matching keys from external VPS API
    await Promise.allSettled(Array.from(vpsIdsToDelete).map((id) => deleteApifyKey(id)))

    // 4. Hard delete from Supabase database matching either DB IDs or key strings
    const deleteFilters: Array<{ id: { in: string[] } } | { key: { in: string[] } }> = [
      { id: { in: Array.from(dbIds) } },
    ]
    if (keyStrings.size > 0) {
      deleteFilters.push({ key: { in: Array.from(keyStrings) } })
    }

    const deletedResult = await db.apifyKey.deleteMany({
      where: {
        OR: deleteFilters,
      },
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
