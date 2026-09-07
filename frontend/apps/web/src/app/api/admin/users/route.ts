import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 20))
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim()
    const serviceFilter = searchParams.get('service')?.trim()

    const where: Record<string, unknown> = {}
    if (status && ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'].includes(status)) {
      where.status = status
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (serviceFilter) {
      where.servicesOffered = { has: serviceFilter }
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          plan: true,
          createdAt: true,
          servicesOffered: true,
          preferredLeadCategories: true,
          outreachExperience: true,
          discoverySource: true,
          tags: true,
          portfolio: true,
          website: true,
          linkedin: true,
          instagram: true,
          dribbble: true,
          behance: true,
          github: true,
          twitter: true,
          creditAccount: {
            select: { subscriptionBalance: true, bonusBalance: true, renewalDate: true },
          },
        },
      }),
      db.user.count({ where }),
    ])

    const totalPages = Math.ceil(total / pageSize)

    const usersWithCredits = users.map((u) => ({
      ...u,
      creditAccount: u.creditAccount
        ? {
            subscriptionBalance: u.creditAccount.subscriptionBalance,
            bonusBalance: u.creditAccount.bonusBalance,
            total: u.creditAccount.subscriptionBalance + u.creditAccount.bonusBalance,
          }
        : { subscriptionBalance: 0, bonusBalance: 0, total: 0 },
    }))

    return NextResponse.json({
      data: usersWithCredits,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 },
      )
    }
    if (error instanceof Error && error.name === 'AuthRequiredError') {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    console.error('[Admin Users API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}
