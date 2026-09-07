import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { ExternalApiError } from '@/lib/external-api/client'
import {
  getIntelligenceSettings,
  getOpenRouterApiKey,
  updateOpenRouterApiKey,
  getContactCompassToken,
  updateContactCompassToken,
  getHunterApiKey,
  updateHunterApiKey,
  getContactOutToken,
  updateContactOutToken,
  getApolloApiKey,
  updateApolloApiKey,
  getAutomationSettings,
  updateAutomationSettings,
} from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

// Enrichment keys + automation are writable. Intelligence is display-only;
// the OpenRouter key is editable via the dedicated `openrouter` service.
const GETTERS = {
  intelligence: getIntelligenceSettings,
  'openrouter': getOpenRouterApiKey,
  'contact-compass': getContactCompassToken,
  hunter: getHunterApiKey,
  contactout: getContactOutToken,
  apollo: getApolloApiKey,
  automation: getAutomationSettings,
} as const

const UPDATERS: Record<string, (body: Record<string, unknown>) => Promise<unknown>> = {
  'openrouter': (body) => updateOpenRouterApiKey(String(body?.api_key ?? '').trim()),
  'contact-compass': (body) => updateContactCompassToken(String(body?.token ?? '').trim()),
  hunter: (body) => updateHunterApiKey(String(body?.api_key ?? '').trim()),
  contactout: (body) => updateContactOutToken(String(body?.token ?? '').trim()),
  apollo: (body) => updateApolloApiKey(String(body?.api_key ?? '').trim()),
  automation: (body) => {
    const b = body as {
      auto_scrape_enabled?: boolean
      auto_enrichment_enabled?: boolean
      keep_alive_enabled?: boolean
    }
    return updateAutomationSettings({
      auto_scrape_enabled: b.auto_scrape_enabled,
      auto_enrichment_enabled: b.auto_enrichment_enabled,
      keep_alive_enabled: b.keep_alive_enabled,
    })
  },
}

type ServiceKey = keyof typeof GETTERS

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
  }
  if (error instanceof ExternalApiError) {
    return NextResponse.json({ code: 'ERROR', message: error.externalMessage }, { status: error.status })
  }
  const msg = error instanceof Error ? error.message : fallback
  return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')
    if (!service || !(service in GETTERS)) {
      return NextResponse.json({ code: 'BAD_REQUEST', message: `Unknown settings service: ${service}` }, { status: 400 })
    }
    const data = await GETTERS[service as ServiceKey]()
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    return errorResponse(error, 'Failed to fetch settings')
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')
    const body = await request.json()

    if (!service || !UPDATERS[service]) {
      return NextResponse.json(
        { code: 'BAD_REQUEST', message: `Unknown or read-only settings service: ${service}` },
        { status: 400 },
      )
    }
    const data = await UPDATERS[service](body)
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    return errorResponse(error, 'Failed to update settings')
  }
}
