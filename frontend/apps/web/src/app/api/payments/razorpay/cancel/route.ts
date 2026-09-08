import { NextResponse } from 'next/server'
import { requireActiveUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { paymentService } from '@/lib/services/payment'
import { getRazorpay } from '@/lib/razorpay'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const authUser = await requireActiveUser(request)
    const userId = authUser.uid

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ code: 'USER_NOT_FOUND', message: 'User not found' }, { status: 404 })
    }

    const subscriptionId = user.razorpaySubscriptionId

    if (subscriptionId) {
      try {
        await getRazorpay().subscriptions.cancel(subscriptionId)
      } catch (err: any) {
        console.warn(
          `[Razorpay Cancel] Failed to cancel subscription ${subscriptionId}: ${err.message}`,
        )
      }
    }

    await paymentService.cancel(userId, 'razorpay')

    return NextResponse.json({
      success: true,
      message: 'Your subscription has been cancelled. Your plan has been reset to Free.',
    })
  } catch (err: any) {
    console.error('[Razorpay Cancel] Error:', err.message)
    return NextResponse.json(
      { code: 'PAYMENT_PROVIDER_ERROR', message: 'Failed to cancel subscription. Please try again.' },
      { status: 500 },
    )
  }
}
