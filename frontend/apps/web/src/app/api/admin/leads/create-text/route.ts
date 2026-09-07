import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { fetchApi } from '@/lib/external-api/client'
import { ExternalApiError } from '@/lib/external-api/client'
import type { ExternalPost } from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

interface ManualLeadRequest {
  content: string
  keyword: string
  authorName?: string
  platform?: string
  contactEmail?: string
  contactPhone?: string
  contactName?: string
  contactCompany?: string
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body: ManualLeadRequest = await request.json()

    if (!body.content?.trim()) {
      return NextResponse.json({ success: false, message: 'Content is required' }, { status: 400 })
    }
    if (!body.keyword?.trim()) {
      return NextResponse.json({ success: false, message: 'Keyword is required' }, { status: 400 })
    }

    // Step 1 — create the manual lead post
    const createRes = await fetchApi<{ success: boolean; data?: ExternalPost; message?: string }>(
      '/posts/manual',
      {
        method: 'POST',
        body: JSON.stringify({
          content: body.content.trim(),
          keyword: body.keyword.trim(),
          authorName: body.contactName?.trim() || body.authorName?.trim() || 'Manual Entry',
          platform: body.platform || 'manual',
        }),
      },
    )

    const post = createRes.data
    if (!post?.id) {
      return NextResponse.json({ success: false, message: createRes.message || 'Failed to create lead' }, { status: 500 })
    }

    // Step 2 — if contact details provided, save them immediately (skips enrichment APIs)
    const hasContact = body.contactEmail?.trim() || body.contactPhone?.trim()
    if (hasContact) {
      try {
        await fetchApi(`/posts/${post.id}/manual-contact`, {
          method: 'PUT',
          body: JSON.stringify({
            email: body.contactEmail?.trim() || undefined,
            phone: body.contactPhone?.trim() || undefined,
            note: body.contactName?.trim()
              ? `Manually added — ${body.contactName.trim()}${body.contactCompany ? ` @ ${body.contactCompany}` : ''}`
              : undefined,
          }),
        })
      } catch (contactErr) {
        // Contact save failed but lead was created — don't fail the whole request
        console.warn('[Manual Lead] Contact details save failed:', contactErr)
      }
    }

    return NextResponse.json({
      success: true,
      data: post,
      message: hasContact
        ? 'Lead added with contact details. Queued for qualification.'
        : 'Lead added and queued for qualification.',
    })
  } catch (error: unknown) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json({ success: false, message: error.externalMessage }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : 'Failed to create lead'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
