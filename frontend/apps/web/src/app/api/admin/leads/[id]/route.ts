import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ExternalApiError } from '@/lib/external-api/client'
import {
  getPost,
  approvePost,
  rejectPost,
  regenerateIntel,
  reEnrichPost,
  deletePost,
  updatePostLabel,
  updatePost,
  reExtractPost,
  claimPost,
  type ExternalPost,
} from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(_request)
    const { id } = await params
    const post = await getPost(id)
    return NextResponse.json({ success: true, data: post })
  } catch (error: unknown) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json({ success: false, message: error.externalMessage }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch lead'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(_request)
    const { id } = await params
    const body = await _request.json()
    const { action } = body ?? {}

    switch (action) {
      case 'approve': {
        // Gate approval on intelligence existing: a lead must have a completed
        // intel report before it is released to the user feed (the feed only
        // shows leads with `approved` + `intelligence`). Generate first, confirm,
        // then approve. If intel is not ready, we do NOT approve.
        let intelResult: { post: ExternalPost; mode: string }
        try {
          intelResult = await regenerateIntel(id)
        } catch {
          return NextResponse.json(
            { success: false, message: 'Intelligence generation failed. Lead was NOT approved — retry to generate intel and approve.' },
            { status: 422 },
          )
        }

        const hasIntel = () => !!intelResult.post.intelligence

        let post = intelResult.post
        if (intelResult.mode === 'queued' || !hasIntel()) {
          let attempts = 0
          while (!post.intelligence && attempts < 8) {
            await new Promise((r) => setTimeout(r, 1500))
            post = await getPost(id)
            attempts++
          }
        }

        if (!post.intelligence) {
          return NextResponse.json(
            { success: false, message: 'Intel report is still generating. Lead was NOT approved — retry shortly to approve with a completed report.' },
            { status: 409 },
          )
        }

        const approved = await approvePost(id)
        return NextResponse.json({ success: true, data: approved, mode: intelResult.mode, message: 'Lead approved and released to the feed with intelligence report.' })
      }
      case 'reject': {
        await rejectPost(id)
        return NextResponse.json({ success: true, message: 'Lead rejected and moved to noise' })
      }
      case 'regenerate-intel': {
        const result = await regenerateIntel(id)
        return NextResponse.json({ success: true, data: result.post, mode: result.mode })
      }
      case 're-enrich': {
        await reEnrichPost(id)
        return NextResponse.json({ success: true, message: 'Re-enrichment queued' })
      }
      case 'label': {
        const { status, is_training_data } = body ?? {}
        const updated = await updatePostLabel(id, { status, is_training_data })
        return NextResponse.json({ success: true, data: updated, message: `Lead marked ${status}` })
      }
      case 'delete': {
        await deletePost(id)
        return NextResponse.json({ success: true, message: 'Lead deleted' })
      }
      case 're-extract': {
        const result = await reExtractPost(id)
        return NextResponse.json({ success: true, message: result.message || 'AI re-extraction queued' })
      }
      case 'claim': {
        const claimed = await claimPost(id)
        return NextResponse.json({ success: true, data: claimed, message: 'Lead claimed! Contact details unlocked.' })
      }
      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error: unknown) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json({ success: false, message: error.externalMessage }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : 'Failed to process action'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(_request)
    const { id } = await params
    const body = await _request.json()
    const updated = await updatePost(id, body)
    return NextResponse.json({ success: true, data: updated, message: 'Lead updated' })
  } catch (error: unknown) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json({ success: false, message: error.externalMessage }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : 'Failed to update lead'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
