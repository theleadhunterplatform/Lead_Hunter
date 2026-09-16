import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ExternalApiError, fetchApi } from '@/lib/external-api/client'
import {
  getPosts,
  bulkApprove,
  bulkApproveByIds,
  bulkReject,
  bulkDeletePosts,
  bulkReanalyse,
  bulkReEnrich,
  trainAiNow,
} from '@/lib/external-api/client'
import { db } from '@/lib/db'
import { oracleDb } from '@/lib/oracle-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = parseInt(searchParams.get('perPage') || '50', 10)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const keyword = searchParams.get('keyword') || undefined
    const platform = searchParams.get('platform') || undefined

    const result = await getPosts({ page, perPage, status, search, keyword, platform })
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json({ code: 'EXTERNAL_ERROR', message: error.externalMessage }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch leads'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const { action, ids, filters } = body ?? {}

    switch (action) {
      case 'bulk-approve':
        if (ids && Array.isArray(ids)) {
          const result = await bulkApproveByIds(ids)
          return NextResponse.json(result)
        }
        const approveResult = await bulkApprove(filters)
        return NextResponse.json(approveResult)

      case 'bulk-reject':
        const rejectResult = await bulkReject(filters)
        return NextResponse.json(rejectResult)

      case 'bulk-delete':
        if (!ids || !Array.isArray(ids)) {
          return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'ids array required' }, { status: 400 })
        }
        const deleteResult = await bulkDeletePosts(ids)
        return NextResponse.json(deleteResult)

      case 'bulk-reanalyse':
        const reanalyseResult = await bulkReanalyse(filters)
        return NextResponse.json(reanalyseResult)

      case 'bulk-re-enrich':
        const reEnrichResult = await bulkReEnrich(filters)
        return NextResponse.json(reEnrichResult)

      case 'train-ai': {
        const trainResult = await trainAiNow()
        return NextResponse.json({
          success: true,
          data: trainResult,
          message: trainResult?.message || 'AI training complete.',
        })
      }

      case 'bulk-title': {
        const titleRes = await fetchApi<{ success: boolean; queued: number; message: string }>(
          '/posts/bulk-title',
          { method: 'POST', body: JSON.stringify(filters || {}) },
        )
        return NextResponse.json(titleRes)
      }

      case 'bulk-intelligence': {
        const intelRes = await fetchApi<{ success: boolean; queued: number; message: string }>(
          '/posts/bulk-intelligence',
          { method: 'POST', body: JSON.stringify(filters || {}) },
        )
        return NextResponse.json(intelRes)
      }

      case 'purge-unclaimed-10-days': {
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)

        // Find candidate leads older than 10 days that are not already deleted
        const candidates = await oracleDb.leadPost.findMany({
          where: {
            created_at: { lt: tenDaysAgo },
            is_deleted: false,
          },
          select: { id: true },
        })

        if (candidates.length === 0) {
          return NextResponse.json({
            success: true,
            purgedCount: 0,
            message: 'No leads older than 10 days found to purge.',
          })
        }

        const candidateIds = candidates.map((c) => c.id)

        // Identify which leads are claimed or saved by ANY user
        const claimedStates = await db.userLeadState.findMany({
          where: {
            leadId: { in: candidateIds },
            OR: [{ isSaved: true }, { isRevealed: true }, { status: { not: 'new' } }],
          },
          select: { leadId: true },
        })

        const claimedSet = new Set(claimedStates.map((s) => s.leadId))
        const safePurgeIds = candidateIds.filter((id) => !claimedSet.has(id))

        if (safePurgeIds.length > 0) {
          await oracleDb.leadPost.updateMany({
            where: { id: { in: safePurgeIds } },
            data: { is_deleted: true },
          })
        }

        return NextResponse.json({
          success: true,
          purgedCount: safePurgeIds.length,
          preservedClaimedCount: claimedSet.size,
          message: `Successfully purged ${safePurgeIds.length} unclaimed leads older than 10 days. All ${claimedSet.size} user-claimed leads were permanently preserved.`,
        })
      }

      default:
        return NextResponse.json({ code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error: unknown) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json({ code: 'EXTERNAL_ERROR', message: error.externalMessage }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : 'Failed to process action'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
