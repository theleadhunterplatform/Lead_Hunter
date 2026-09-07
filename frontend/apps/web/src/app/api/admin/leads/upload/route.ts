import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ExternalApiError } from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const formData = await request.formData()
    const images = formData.getAll('images').filter((f): f is File => f instanceof File)
    if (images.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Please upload at least one image' },
        { status: 400 },
      )
    }

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL
    const EMAIL = process.env.EXTERNAL_API_EMAIL
    const PASSWORD = process.env.EXTERNAL_API_PASSWORD
    if (!BASE_URL || !EMAIL || !PASSWORD) {
      return NextResponse.json(
        { success: false, message: 'External API credentials not configured' },
        { status: 500 },
      )
    }

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
    if (!loginRes.ok) {
      return NextResponse.json({ success: false, message: 'External API auth failed' }, { status: 500 })
    }
    const loginJson = await loginRes.json()
    const token = loginJson?.data?.access_token

    const outForm = new FormData()
    images.forEach((f) => outForm.append('images', f))
    const keyword = formData.get('keyword')
    if (keyword) outForm.append('keyword', String(keyword))
    const authorName = formData.get('authorName')
    if (authorName) outForm.append('authorName', String(authorName))
    const platform = formData.get('platform')
    if (platform) outForm.append('platform', String(platform))

    const res = await fetch(`${BASE_URL}/posts/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: outForm,
    })

    const text = await res.text()
    const json = text ? JSON.parse(text) : {}

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: json?.message || `Upload failed (${res.status})` },
        { status: res.status >= 500 ? 502 : 400 },
      )
    }

    return NextResponse.json(json)
  } catch (error: unknown) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json({ success: false, message: error.externalMessage }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : 'Failed to process upload'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
