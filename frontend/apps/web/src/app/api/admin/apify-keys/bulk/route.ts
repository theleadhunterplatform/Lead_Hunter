import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError, AuthRequiredError } from '@/lib/auth'
import { createApifyKey } from '@/lib/external-api/client'
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
    const errors: Array<{ key: string; label?: string; error: string }> = []

    for (const item of items) {
      const rawKey = item.key
      const label = item.label || null

      // Check for duplicates in local DB
      try {
        const existing = await db.apifyKey.findFirst({
          where: { key: rawKey, is_deleted: false },
        })
        if (existing) {
          skippedCount++
          continue
        }
      } catch {
        // continue if db query check fails
      }

      // Live verification with Apify
      try {
        const apifyRes = await fetch('https://api.apify.com/v2/users/me', {
          method: 'GET',
          headers: { Authorization: `Bearer ${rawKey}` },
        })
        if (!apifyRes.ok) {
          const errJson = await apifyRes.json().catch(() => ({}))
          const apifyMsg = errJson?.error?.message || errJson?.message || `HTTP ${apifyRes.status}`
          errors.push({ key: rawKey, label: label || undefined, error: apifyMsg })
          continue
        }
      } catch (err: any) {
        console.warn(`[Bulk Apify Keys] Apify live ping error for ${label || rawKey}:`, err.message)
      }

      // Attempt creation on external VPS API (catch 429/timeout so local DB save still succeeds)
      try {
        await createApifyKey({ key: rawKey, label })
      } catch (externalErr: any) {
        console.warn(`[Bulk Apify Keys] External API notice for ${label || rawKey}:`, externalErr.message)
      }

      // Save to local database
      try {
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
        addedCount++
      } catch (dbErr: any) {
        console.error(`[Bulk Apify Keys] Failed to save key in DB:`, dbErr)
        errors.push({ key: rawKey, label: label || undefined, error: 'Database save failed' })
      }
    }

    return NextResponse.json({
      success: true,
      addedCount,
      skippedCount,
      errorsCount: errors.length,
      errors,
      message: `Successfully added ${addedCount} key(s)${skippedCount > 0 ? `, ${skippedCount} duplicate(s) skipped` : ''}${errors.length > 0 ? `, ${errors.length} failed` : ''}.`,
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
