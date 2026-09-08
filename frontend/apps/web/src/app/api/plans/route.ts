import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_PLANS, DEFAULT_REFILL_PACKS } from '@/app/api/admin/plans/route'

export const dynamic = 'force-dynamic'

export async function GET() {
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

    return NextResponse.json({
      success: true,
      data: {
        plans,
        refillPacks,
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
