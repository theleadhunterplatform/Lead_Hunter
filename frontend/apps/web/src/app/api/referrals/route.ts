import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthRequiredError } from '@/lib/auth'
import { referralService } from '@/lib/services/referral'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request)
    const host = request.headers.get('host')
    const protocol = host?.includes('localhost') ? 'http' : 'https'
    const origin = host ? `${protocol}://${host}` : undefined

    const stats = await referralService.getReferralStats(authUser.uid, origin)
    return NextResponse.json({ success: true, data: stats })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }
    console.error('[Referrals API GET] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve referral data' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const referralCode = String(body.referralCode || '').trim()

    if (!referralCode) {
      return NextResponse.json(
        { success: false, message: 'Referral code is required' },
        { status: 400 },
      )
    }

    const result = await referralService.attributeReferral({
      referredUserId: authUser.uid,
      referralCode,
    })

    if (!result.success) {
      const messages: Record<string, string> = {
        INVALID_CODE: 'Invalid referral code. Please check and try again.',
        SELF_REFERRAL: 'You cannot use your own referral code.',
        ALREADY_REFERRED: 'A referral code has already been applied to your account.',
        EMPTY_CODE: 'Please enter a valid referral code.',
      }
      return NextResponse.json(
        { success: false, message: messages[result.reason || ''] || 'Failed to apply referral code' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Referral code applied successfully! +5 bonus credits awarded.',
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }
    console.error('[Referrals API POST] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to apply referral code' },
      { status: 500 },
    )
  }
}
