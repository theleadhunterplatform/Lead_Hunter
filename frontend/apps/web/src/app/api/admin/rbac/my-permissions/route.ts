import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAdmin(request)
    const orgId = request.headers.get('x-org-id')

    const where: Record<string, unknown> = {
      userId: authUser.uid,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    }

    if (orgId) {
      where.OR = [
        { scopeType: 'global' },
        { scopeType: 'organization', organizationId: orgId },
      ]
    } else {
      where.scopeType = 'global'
    }

    const assignments = await db.roleAssignment.findMany({
      where,
      include: { role: true },
    })

    const permissions = new Set<string>()
    let primaryRole: Record<string, unknown> | null = null

    for (const a of assignments) {
      if (a.role) {
        const perms = a.role.permissions as string[]
        perms.forEach((p: string) => permissions.add(p))
        if (!primaryRole || a.scopeType === 'global') {
          primaryRole = { ...a.role, _id: a.role.id }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        permissions: Array.from(permissions),
        role: primaryRole,
      },
    })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' }, { status: 500 })
  }
}
