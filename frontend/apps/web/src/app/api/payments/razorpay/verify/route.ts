import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser, ForbiddenError, AuthRequiredError } from '@/lib/auth'
import { creditService } from '@/lib/services/credits'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireActiveUser(request)

    const authHeader = request.headers.get('Authorization') || ''
    const body = await request.json()

    const res = await fetch(`${API_URL}/payments/razorpay/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (res.ok && data.success) {
      const addedTokens = data.data?.added
      const verifiedPlan = data.data?.plan

      if (typeof addedTokens === 'number' && addedTokens > 0) {
        await creditService.grantBonus(authUser.uid, addedTokens, 'razorpay_topup')
      } else if (verifiedPlan && !verifiedPlan.startsWith('topup_')) {
        const appPlan =
          verifiedPlan === 'paid' || verifiedPlan === 'freelancer'
            ? 'FREELANCER'
            : verifiedPlan === 'enterprise' || verifiedPlan === 'agency'
            ? 'AGENCY'
            : verifiedPlan.toUpperCase()
        await creditService.assignPlan(authUser.uid, appPlan)
      }
    }

    return NextResponse.json(data, { status: res.status })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to verify payment'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
