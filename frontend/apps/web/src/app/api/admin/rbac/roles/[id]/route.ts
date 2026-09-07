import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const role = await db.role.findUnique({ where: { id } })
    if (!role) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Role not found' }, { status: 404 })
    }
    const updated = await db.role.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        slug: body.slug ?? undefined,
        description: body.description ?? undefined,
        permissions: body.permissions ?? undefined,
        scopeType: body.scopeType ?? undefined,
        isSystemRole: body.isSystemRole ?? undefined,
      },
    })
    return NextResponse.json({
      success: true,
      data: { ...updated, _id: updated.id, scope: { type: updated.scopeType, organizationId: null } },
    })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' }, { status: 500 })
  }
}
