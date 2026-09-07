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
        return NextResponse.json(trainResult)
      }

      case 'bulk-title': {
        const titleRes = await fetchApi<{ success: boolean; queued: number; message: string }>(
          '/posts/bulk-title',
          { method: 'POST', body: JSON.stringify(filters || {}) },
        )
        return NextResponse.json(titleRes)
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
