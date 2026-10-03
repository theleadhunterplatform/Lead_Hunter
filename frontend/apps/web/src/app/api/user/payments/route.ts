import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireActiveUser, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { formatPaymentLog } from '@/lib/payments-format'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireActiveUser(request)

    const logs = await db.auditLog.findMany({
      where: {
        userId: authUser.uid,
        action: 'PAYMENT_CREDITED',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const payments = logs.map((log) => formatPaymentLog(log))

    return NextResponse.json({
      success: true,
      payments,
      count: payments.length,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch payment history'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
