import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { formatPaymentLog } from '@/lib/payments-format'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request)
    const { id: userId } = await params

    const logs = await db.auditLog.findMany({
      where: {
        userId,
        action: 'PAYMENT_CREDITED',
      },
      include: {
        user: { select: { name: true, email: true, plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const payments = logs.map((log) => formatPaymentLog(log))

    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch user payments'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
