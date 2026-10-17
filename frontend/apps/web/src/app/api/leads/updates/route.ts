import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { oracleDb } from '@/lib/oracle-db'
import { mapLeadPostToExternal } from '@/lib/oracle-mapper'
import { requireFullyAuthorized, handleAuthApiError } from '@/lib/auth'
import { LEAD_POST_SELECT, externalPostToAppLead } from '@/lib/lead-mapper'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const { searchParams } = new URL(request.url)
    const sinceParam = searchParams.get('since')
    const niche = searchParams.get('niche')

    if (!sinceParam) {
      return NextResponse.json({ hasNew: false, count: 0, newLeads: [] })
    }

    const sinceDate = new Date(sinceParam)
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json({ hasNew: false, count: 0, newLeads: [] })
    }

    // Fast check: look for freshly approved and active leads created or reviewed after `since`
    const where: any = {
      is_deleted: false,
      review_status: 'approved',
      intelligence: { not: null as string | null },
      source: { not: 'seed' },
      OR: [
        { reviewed_at: { gt: sinceDate } },
        { created_at: { gt: sinceDate } },
        { updated_at: { gt: sinceDate } },
      ],
    }

    if (niche && niche !== 'All') {
      where.niche = niche
    }

    // 1. Lightweight count check first (minimal egress)
    const count = await oracleDb.leadPost.count({ where })

    if (count === 0) {
      return NextResponse.json({ hasNew: false, count: 0, newLeads: [] })
    }

    // 2. If new leads exist, fetch only the new ones (capped at 20)
    const rawLeads = await oracleDb.leadPost.findMany({
      where,
      select: LEAD_POST_SELECT,
      orderBy: [
        { reviewed_at: 'desc' },
        { created_at: 'desc' },
      ],
      take: 20,
    })

    const externalLeads = rawLeads.map(mapLeadPostToExternal)
    const leadIds = externalLeads.map((l) => l.id)

    // Pull user lead states for the new items
    const userStates =
      leadIds.length > 0
        ? await db.userLeadState.findMany({
            where: { userId: authUser.uid, leadId: { in: leadIds } },
          })
        : []
    const userStateMap = new Map(userStates.map((s) => [s.leadId, s]))

    const newLeads = externalLeads.map((post) =>
      externalPostToAppLead(post, userStateMap.get(post.id) || null, false),
    )

    return NextResponse.json({
      hasNew: true,
      count,
      newLeads,
    })
  } catch (error) {
    const authResponse = handleAuthApiError(error)
    if (authResponse) return authResponse

    console.warn('[API leads/updates] Check failed:', error)
    return NextResponse.json({ hasNew: false, count: 0, newLeads: [] })
  }
}
