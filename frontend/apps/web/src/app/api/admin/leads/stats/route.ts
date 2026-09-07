import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getLeadIntelligenceStats, getAiMetrics, getIntelligenceSettings, getPosts } from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const [statsRes, aiMetrics, intelSettings] = await Promise.allSettled([
      getLeadIntelligenceStats(),
      getAiMetrics(),
      getIntelligenceSettings(),
    ])

    const stats = statsRes.status === 'fulfilled' ? statsRes.value : {}
    const aiMetricsData = aiMetrics.status === 'fulfilled' ? aiMetrics.value : { status: 'unavailable' }
    const intelSettingsData = intelSettings.status === 'fulfilled' ? intelSettings.value : { is_configured: false, model: 'unknown' }

    return NextResponse.json({ success: true, data: { stats, aiMetrics: aiMetricsData, intelSettings: intelSettingsData } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch lead stats'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
