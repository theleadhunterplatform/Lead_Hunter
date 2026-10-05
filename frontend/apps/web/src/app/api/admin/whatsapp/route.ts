import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const [statusRes, groupsRes, dbSetting] = await Promise.allSettled([
      fetch(`${BASE_URL}/whatsapp/status`, { headers, cache: 'no-store' }),
      fetch(`${BASE_URL}/whatsapp/groups`, { headers, cache: 'no-store' }),
      db.setting.findUnique({ where: { key: 'whatsapp_community_group' } }).catch(() => null),
    ])

    const statusJson = statusRes.status === 'fulfilled' && statusRes.value.ok
      ? await statusRes.value.json().catch(() => null)
      : null

    const groupsJson = groupsRes.status === 'fulfilled' && groupsRes.value.ok
      ? await groupsRes.value.json().catch(() => null)
      : null

    const dbVal = dbSetting.status === 'fulfilled' && dbSetting.value?.value
      ? (dbSetting.value.value as { id?: string; name?: string })
      : null

    const configuredGroupId = statusJson?.data?.configuredGroupId || dbVal?.id || ''
    const configuredGroupName = statusJson?.data?.configuredGroupName || dbVal?.name || null

    return NextResponse.json({
      success: true,
      data: {
        status: statusJson?.data?.status || 'disconnected',
        botNumber: statusJson?.data?.botNumber || null,
        configuredGroupId,
        configuredGroupName,
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

    // Handle Setting the target group
    if (body.action === 'set_target') {
      const { groupId, groupName } = body
      if (!groupId?.trim()) {
        return NextResponse.json({ success: false, message: 'groupId is required' }, { status: 400 })
      }

      // 1. Save in local Supabase database
      try {
        await db.setting.upsert({
          where: { key: 'whatsapp_community_group' },
          create: {
            key: 'whatsapp_community_group',
            value: {
              id: groupId.trim(),
              name: groupName?.trim() || null,
              updatedAt: new Date().toISOString(),
            },
            description: 'Target WhatsApp community group for automated lead drop alerts',
          },
          update: {
            value: {
              id: groupId.trim(),
              name: groupName?.trim() || null,
              updatedAt: new Date().toISOString(),
            },
          },
        })
      } catch (dbErr) {
        console.warn('[Admin WhatsApp] Failed to save target group to db.setting:', dbErr)
      }

      // 2. Notify backend server memory
      try {
        const beRes = await fetch(`${BASE_URL}/whatsapp/target-group`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ groupId: groupId.trim(), groupName: groupName?.trim() }),
        })
        const beJson = await beRes.json().catch(() => ({}))
        if (beRes.ok) {
          return NextResponse.json({
            success: true,
            message: beJson?.message || 'Target WhatsApp group updated successfully',
            data: beJson?.data,
          })
        }
      } catch (beErr) {
        console.warn('[Admin WhatsApp] Backend notification error:', beErr)
      }

      return NextResponse.json({
        success: true,
        message: `Target WhatsApp group set to "${groupName || groupId}"`,
        data: { configuredGroupId: groupId, configuredGroupName: groupName },
      })
    }

    // Handle Clearing the target group
    if (body.action === 'clear_target') {
      try {
        await db.setting.deleteMany({
          where: { key: 'whatsapp_community_group' },
        })
      } catch (dbErr) {
        console.warn('[Admin WhatsApp] Failed to clear db.setting target group:', dbErr)
      }

      try {
        await fetch(`${BASE_URL}/whatsapp/target-group`, {
          method: 'DELETE',
          headers,
        })
      } catch (beErr) {
        console.warn('[Admin WhatsApp] Backend clear target error:', beErr)
      }

      return NextResponse.json({
        success: true,
        message: 'Target WhatsApp group cleared',
        data: { configuredGroupId: '', configuredGroupName: null },
      })
    }

    // If unlinking device, also wipe the saved target group
    if (body.action === 'unlink') {
      try {
        await db.setting.deleteMany({
          where: { key: 'whatsapp_community_group' },
        })
      } catch (dbErr) {
        console.warn('[Admin WhatsApp] Failed to clear db.setting on unlink:', dbErr)
      }
    }

    const endpoint = body.action === 'alert'
      ? `${BASE_URL}/whatsapp/alert`
      : body.action === 'reconnect'
      ? `${BASE_URL}/whatsapp/reconnect`
      : body.action === 'unlink'
      ? `${BASE_URL}/whatsapp/unlink`
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
