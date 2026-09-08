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
      'Community support',
    ],
    razorpayPlanId: '',
    isActive: true,
  },
  {
    id: 'FREELANCER',
    name: 'Freelancer Pro',
    credits: 500,
    price: 999,
    description: 'Perfect for active freelancers looking for consistent client pipeline',
    features: [
      '500 credits renewed monthly',
      'Unused credits rollover (up to 30 days)',
      'Direct email & phone reveals',
      'Deep AI strategic intelligence breakdown',
      'Priority lead delivery',
    ],
    razorpayPlanId: '',
    isActive: true,
  },
  {
    id: 'AGENCY',
    name: 'Agency Scale',
    credits: 1000,
    price: 2499,
    description: 'Maximum lead volume and outreach velocity for growing agencies',
    features: [
      '1,000 credits renewed monthly',
      'Full rollover support',
      'Dedicated Google Sheets CRM export',
      'VIP Slack & priority support',
      'Multi-seat ready',
    ],
    razorpayPlanId: '',
    isActive: true,
  },
]

export const DEFAULT_REFILL_PACKS = [
  { id: 'topup_10', tokens: 10, price: 99, label: '10 Credits', isActive: true },
  { id: 'topup_50', tokens: 50, price: 399, label: '50 Credits (Popular)', isActive: true },
  { id: 'topup_100', tokens: 100, price: 699, label: '100 Credits (Best Value)', isActive: true },
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
