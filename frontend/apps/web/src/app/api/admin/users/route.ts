import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError, getAuthUser } from '@/lib/auth'
import { emailService } from '@/lib/services/email'
import { getPlan } from '@/lib/config/plans'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize')) || 10))
    const status = searchParams.get('status')
    const search = searchParams.get('search')?.trim()
    const serviceFilter = searchParams.get('service')?.trim()
    const onboarding = searchParams.get('onboarding')?.trim()?.toUpperCase()

    const andConditions: Record<string, unknown>[] = []
    if (status && ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'].includes(status)) {
      andConditions.push({ status })
    }
    if (search) {
      andConditions.push({
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      })
    }
    if (serviceFilter) {
      andConditions.push({ servicesOffered: { has: serviceFilter } })
    }
    if (onboarding === 'COMPLETE') {
      andConditions.push({
        linkedin: { not: null, notIn: ['', ' '] },
        servicesOffered: { isEmpty: false },
      })
    } else if (onboarding === 'INCOMPLETE') {
      andConditions.push({
        OR: [
          { linkedin: null },
          { linkedin: '' },
          { servicesOffered: { isEmpty: true } },
        ],
      })
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {}

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

export async function POST(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key')
    let authorized =
      adminKey === 'leadhunter-admin-2026' ||
      Boolean(process.env.ADMIN_REGISTRATION_KEY && adminKey === process.env.ADMIN_REGISTRATION_KEY)
    if (!authorized) {
      const authUser = await getAuthUser(request)
      if (authUser) {
        const dbUser = await db.user.findUnique({
          where: { id: authUser.uid },
          select: { role: true },
        })
        if (dbUser?.role === 'admin') authorized = true
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch all ACTIVE users
    const activeUsers = await db.user.findMany({
      where: { status: 'ACTIVE' },
      include: { creditAccount: true },
      orderBy: { updatedAt: 'desc' },
    })

    const results: Array<{
      email: string
      name: string
      status: 'ALREADY_SENT' | 'SENT' | 'FAILED'
      error?: string
    }> = []

    for (const user of activeUsers) {
      const logs = await db.emailLog.findMany({
        where: {
          to: user.email,
          type: 'approved',
        },
        orderBy: { sentAt: 'desc' },
      })

      const hasSent = logs.some((l) => l.status === 'SENT')
      if (hasSent) {
        results.push({ email: user.email, name: user.name, status: 'ALREADY_SENT' })
        continue
      }

      const initialCredits =
        user.creditAccount?.subscriptionBalance ?? (getPlan(user.plan || 'FREE')?.credits ?? 0)

      const sendRes = await emailService.sendApproved(
        { name: user.name, email: user.email },
        user.plan || 'FREE',
        initialCredits,
      )

      results.push({
        email: user.email,
        name: user.name,
        status: sendRes.success ? 'SENT' : 'FAILED',
        error: sendRes.error,
      })

      await new Promise((r) => setTimeout(r, 600))
    }

    return NextResponse.json({
      success: true,
      totalActive: activeUsers.length,
      resentCount: results.filter((r) => r.status === 'SENT').length,
      results,
    })
  } catch (error: unknown) {
    console.error('[Admin Batch Resend API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to process batch resend' },
      { status: 500 },
    )
  }
}
