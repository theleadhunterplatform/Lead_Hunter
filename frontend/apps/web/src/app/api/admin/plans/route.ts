import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError, AuthRequiredError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const DEFAULT_PLANS = [
  {
    id: 'FREE',
    name: 'Free Starter',
    credits: 50,
    price: 0,
    description: 'Explore verified leads with 50 monthly credits',
    features: [
      '50 credits renewed monthly',
      'Instant lead reveal with full contact data',
      'AI intelligence reports',
      'No credit card required',
      'Community support',
    ],
    razorpayPlanId: '',
    isActive: true,
  },
  {
    id: 'FREELANCER',
    name: 'Freelancer Pro',
    credits: 1000,
    price: 999,
    description: 'Perfect for active freelancers looking for consistent client pipeline',
    features: [
      '1000 credits renewed monthly',
      'Unused credits roll over for 15 days',
      'Direct email & phone reveals',
      'Deep AI strategic intelligence breakdown',
      'Priority lead delivery',
    ],
    razorpayPlanId: '',
    isActive: true,
  },
]

export const DEFAULT_REFILL_PACKS = [
  { id: 'topup_125', tokens: 125, price: 199, label: '125 Credits', isActive: true },
  { id: 'topup_275', tokens: 275, price: 399, label: '275 Credits (Popular)', isActive: true },
  { id: 'topup_450', tokens: 450, price: 599, label: '450 Credits (Best Value)', isActive: true },
]

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const [plansSetting, refillSetting] = await Promise.all([
      db.setting.findUnique({ where: { key: 'plans_config' } }),
      db.setting.findUnique({ where: { key: 'refill_packs_config' } }),
    ])

    const plans = (plansSetting?.value as any) || DEFAULT_PLANS
    const refillPacks = (refillSetting?.value as any) || DEFAULT_REFILL_PACKS

    return NextResponse.json({
      success: true,
      data: {
        plans,
        refillPacks,
      },
    })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch plan settings'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const { plans, refillPacks } = body || {}

    if (plans && Array.isArray(plans)) {
      await db.setting.upsert({
        where: { key: 'plans_config' },
        create: {
          key: 'plans_config',
          value: plans,
          description: 'Subscription plans and pricing configuration',
        },
        update: {
          value: plans,
        },
      })
    }

    if (refillPacks && Array.isArray(refillPacks)) {
      await db.setting.upsert({
        where: { key: 'refill_packs_config' },
        create: {
          key: 'refill_packs_config',
          value: refillPacks,
          description: 'Credit refill packs and pricing configuration',
        },
        update: {
          value: refillPacks,
        },
      })
    }

    try {
      const { clearPlansCache } = await import('@/app/api/plans/route')
      clearPlansCache()
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      message: 'Plan and pricing configurations saved successfully',
    })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to save plan settings'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
