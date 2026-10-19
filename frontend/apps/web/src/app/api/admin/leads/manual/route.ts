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
  authorUrl?: string
  profileUrl?: string
  platform?: string
  contactEmail?: string
  contactPhone?: string
  contactName?: string
  contactCompany?: string
  creditCost?: number | null
  credit_cost?: number | null
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

    const assignedCreditCost = typeof body.credit_cost === 'number'
      ? body.credit_cost
      : typeof body.creditCost === 'number'
        ? body.creditCost
        : undefined

    const rawProfileLink = body.authorUrl?.trim() || body.profileUrl?.trim() || undefined
    const profileLink = rawProfileLink && !/^https?:\/\//i.test(rawProfileLink)
      ? `https://${rawProfileLink}`
      : rawProfileLink

    const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
    const PHONE_REGEX = /(\+?\d[\d\s\-()\/.]{7,}\d)/

    const contactEmail = body.contactEmail?.trim() || (body.content.match(EMAIL_REGEX)?.[0] || undefined)
    const contactPhone = body.contactPhone?.trim() || (body.content.match(PHONE_REGEX)?.[0] || undefined)

    // Step 1 — create the manual lead post (with contact info pre-attached)
    const createRes = await fetchApi<{ success: boolean; data?: ExternalPost; message?: string }>(
      '/posts/manual',
      {
        method: 'POST',
        body: JSON.stringify({
          content: body.content.trim(),
          keyword: body.keyword.trim(),
          authorName: body.contactName?.trim() || body.authorName?.trim() || 'Manual Entry',
          authorUrl: profileLink,
          platform: body.platform || 'manual',
          credit_cost: assignedCreditCost,
          email: contactEmail,
          phone: contactPhone,
        }),
      },
    )

    const post = createRes.data
    const postId = post?.id || (post as any)?._id
    if (!postId) {
      return NextResponse.json({ success: false, message: createRes.message || 'Failed to create lead' }, { status: 500 })
    }

    // Step 2 — also ensure contact details are set via manual-contact endpoint
    const hasContact = contactEmail || contactPhone || profileLink
    if (hasContact) {
      try {
        await fetchApi(`/posts/${postId}/manual-contact`, {
          method: 'PUT',
          body: JSON.stringify({
            email: contactEmail,
            phone: contactPhone,
            profile_url: profileLink,
            credit_cost: assignedCreditCost,
            note: body.contactName?.trim()
              ? `Manually added — ${body.contactName.trim()}${body.contactCompany ? ` @ ${body.contactCompany}` : ''}`
              : undefined,
          }),
        })
      } catch (contactErr) {
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
