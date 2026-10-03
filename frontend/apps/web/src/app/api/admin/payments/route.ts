import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { formatPaymentLog } from '@/lib/payments-format'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    const where: any = {
      action: 'PAYMENT_CREDITED',
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { targetId: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true, plan: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const payments = logs.map((log) => formatPaymentLog(log))

    // Calculate basic revenue summary
    const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
      summary: {
        pageVolume: totalVolume,
      },
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch payments'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
