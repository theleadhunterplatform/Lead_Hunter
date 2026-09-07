import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { fetchApi } from '@/lib/external-api/client'
import { ExternalApiError } from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const result = await fetchApi(`/posts/${id}/manual-contact`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json({ success: false, message: error.externalMessage }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : 'Failed to save contact'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
