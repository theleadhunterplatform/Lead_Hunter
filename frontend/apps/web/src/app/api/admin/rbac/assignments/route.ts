import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    const where: Record<string, unknown> = {}
    if (orgId) where.organizationId = orgId

    const assignments = await db.roleAssignment.findMany({
      where,
      include: { role: true },
    })

    const enriched = await Promise.all(
      assignments.map(async (a) => {
          const user = await db.user.findUnique({ where: { id: a.userId }, select: { id: true, name: true, email: true } })
          return {
            ...a,
            _id: a.id,
            roleId: a.role ? { ...a.role, _id: a.role.id, scope: { type: a.role.scopeType, organizationId: null } } : null,
            userId: user ? { ...user, _id: user.id } : a.userId,
            scope: { type: a.scopeType, organizationId: a.organizationId },
          }
        })
    )

    return NextResponse.json({ success: true, data: enriched })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdmin(request)
    const body = await request.json()
    const { userId, roleId, scope, expiresAt } = body

    const [user, role] = await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      db.role.findUnique({ where: { id: roleId } }),
    ])
    if (!user) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
    }
    if (!role) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Role not found' }, { status: 404 })
    }

    const assignment = await db.roleAssignment.create({
      data: {
        userId,
        roleId,
        scopeType: scope?.type || 'global',
        organizationId: scope?.organizationId || null,
        assignedById: authUser.uid,
        expiresAt: expiresAt || null,
      },
      include: { role: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...assignment,
        _id: assignment.id,
        roleId: assignment.role ? { ...assignment.role, _id: assignment.role.id } : null,
        scope: { type: assignment.scopeType, organizationId: assignment.organizationId },
      },
    }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' }, { status: 500 })
  }
}
