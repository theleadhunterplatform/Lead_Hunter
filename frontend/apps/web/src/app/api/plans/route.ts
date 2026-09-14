import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_PLANS, DEFAULT_REFILL_PACKS } from '@/app/api/admin/plans/route'

export const dynamic = 'force-dynamic'

let cachedPlansData: any = null
let cachedPlansExpiresAt = 0
const MEMORY_CACHE_TTL_MS = 60_000

export async function GET() {
  const now = Date.now()
  if (cachedPlansData && now < cachedPlansExpiresAt) {
    return NextResponse.json(cachedPlansData, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    })
  }

  try {
    const [plansSetting, refillSetting] = await Promise.all([
      db.setting.findUnique({ where: { key: 'plans_config' } }),
      db.setting.findUnique({ where: { key: 'refill_packs_config' } }),
    ])

    const rawPlans = (plansSetting?.value as any) || DEFAULT_PLANS
    const rawRefillPacks = (refillSetting?.value as any) || DEFAULT_REFILL_PACKS

    // Filter to active items only
    const plans = rawPlans.filter((p: any) => p.isActive !== false)
    const refillPacks = rawRefillPacks.filter((p: any) => p.isActive !== false)

    cachedPlansData = {
      success: true,
      data: {
        plans,
        refillPacks,
      },
    }
    cachedPlansExpiresAt = now + MEMORY_CACHE_TTL_MS

    return NextResponse.json(cachedPlansData, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load plans'
    return NextResponse.json(
      {
        success: true,
        data: {
          plans: DEFAULT_PLANS,
          refillPacks: DEFAULT_REFILL_PACKS,
        },
        fallback: true,
        error: msg,
      },
      { status: 200 },
    )
  }
}
