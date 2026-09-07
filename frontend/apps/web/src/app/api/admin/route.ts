import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const [totalUsers, pendingUsers, activeUsers, rejectedUsers, suspendedUsers] =
      await Promise.all([
        db.user.count(),
        db.user.count({ where: { status: 'PENDING' } }),
        db.user.count({ where: { status: 'ACTIVE' } }),
        db.user.count({ where: { status: 'REJECTED' } }),
        db.user.count({ where: { status: 'SUSPENDED' } }),
      ])

    return NextResponse.json({
      data: {
        totalUsers,
        pendingUsers,
        activeUsers,
        rejectedUsers,
        suspendedUsers,
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
    console.error('[Admin Stats API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}
