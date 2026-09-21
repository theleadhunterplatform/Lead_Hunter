import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthApiError } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const currentMonth = new Date().toISOString().slice(0, 7)

    const keys = await db.apifyKey.findMany({
      where: { is_deleted: false },
      select: {
        id: true,
        label: true,
        is_active: true,
        comments_used: true,
        comments_limit: true,
        usage_month: true,
      },
    })

    const totalKeys = keys.length
    let totalLimit = 0
    let totalUsed = 0
    let activeKeysCount = 0

    for (const k of keys) {
      // Monthly rollover calculation if month changed
      const used = k.usage_month === currentMonth ? k.comments_used : 0
      const limit = k.comments_limit || 1000
      const remaining = Math.max(0, limit - used)

      totalLimit += limit
      totalUsed += used

      if (k.is_active && remaining > 0) {
        activeKeysCount++
      }
    }

    const totalRemaining = Math.max(0, totalLimit - totalUsed)
    const isExhausted = totalKeys === 0 || activeKeysCount === 0 || totalRemaining === 0

    let reason = ''
    if (totalKeys === 0) {
      reason = 'No Apify API keys are configured in your system.'
    } else if (activeKeysCount === 0 || totalRemaining === 0) {
      reason = `All ${totalKeys} Apify token${totalKeys > 1 ? 's' : ''} have exhausted their monthly scraping quota.`
    }

    return NextResponse.json({
      success: true,
      exhausted: isExhausted,
      totalKeys,
      activeKeys: activeKeysCount,
      totalLimit,
      totalUsed,
      totalRemaining,
      reason,
      percentageRemaining: totalLimit > 0 ? Math.round((totalRemaining / totalLimit) * 100) : 0,
    })
  } catch (error: unknown) {
    const authRes = handleAuthApiError(error)
    if (authRes) return authRes

    console.error('[Admin Apify Status API] Error:', error)
    return NextResponse.json(
      { success: false, exhausted: false, message: 'Failed to verify Apify token status' },
      { status: 500 },
    )
  }
}
