import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function getBackendApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'
  return envUrl.replace(/\/$/, '')
}

async function getBackendAdminToken(): Promise<string | null> {
  const BASE_URL = getBackendApiUrl()
  const EMAIL = process.env.EXTERNAL_API_EMAIL
  const PASSWORD = process.env.EXTERNAL_API_PASSWORD

  if (!EMAIL || !PASSWORD) return null

  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
    if (!loginRes.ok) return null
    const json = await loginRes.json()
    return json?.data?.access_token || null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const BASE_URL = getBackendApiUrl()
    const token = await getBackendAdminToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const [statusRes, groupsRes] = await Promise.allSettled([
      fetch(`${BASE_URL}/whatsapp/status`, { headers, cache: 'no-store' }),
      fetch(`${BASE_URL}/whatsapp/groups`, { headers, cache: 'no-store' }),
    ])

    const statusJson = statusRes.status === 'fulfilled' && statusRes.value.ok
      ? await statusRes.value.json().catch(() => null)
      : null

    const groupsJson = groupsRes.status === 'fulfilled' && groupsRes.value.ok
      ? await groupsRes.value.json().catch(() => null)
      : null

    return NextResponse.json({
      success: true,
      data: {
        status: statusJson?.data?.status || 'disconnected',
        botNumber: statusJson?.data?.botNumber || null,
        configuredGroupId: statusJson?.data?.configuredGroupId || '',
        qrDataUrl: statusJson?.data?.qrDataUrl || null,
        hasQr: !!statusJson?.data?.hasQr,
        groups: groupsJson?.data || [],
      },
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch WhatsApp status'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json().catch(() => ({}))
    const BASE_URL = getBackendApiUrl()
    const token = await getBackendAdminToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const endpoint = body.action === 'alert'
      ? `${BASE_URL}/whatsapp/alert`
      : body.action === 'reconnect'
      ? `${BASE_URL}/whatsapp/reconnect`
      : `${BASE_URL}/whatsapp/test`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const json = await res.json().catch(() => ({}))
    return NextResponse.json(json, { status: res.status })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to execute WhatsApp action'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
