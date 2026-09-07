import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id: targetUserId } = await params

    const logs = await db.auditLog.findMany({
      where: { targetId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const adminIds = [...new Set(logs.map((l) => l.adminId))]
    const admins = await db.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, name: true },
    })
    const adminMap = new Map(admins.map((a) => [a.id, a.name]))

    const logsWithAdmin = logs.map((l) => ({
      id: l.id,
      action: l.action,
      details: l.details,
      adminName: adminMap.get(l.adminId) || 'Unknown',
      createdAt: l.createdAt.toISOString(),
    }))

    return NextResponse.json({ data: logsWithAdmin })
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
    console.error('[Admin Audit Logs API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}
