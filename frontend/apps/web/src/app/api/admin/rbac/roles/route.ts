import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const roles = await db.role.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({
      success: true,
      data: roles.map(r => ({
        ...r,
        _id: r.id,
        scope: { type: r.scopeType, organizationId: r.scopeType === 'organization' ? null : null },
      })),
    })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json()
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-')
    const role = await db.role.create({
      data: {
        name: body.name,
        slug,
        description: body.description || null,
        permissions: body.permissions || [],
        scopeType: body.scopeType || 'organization',
        isSystemRole: body.isSystemRole ?? false,
      },
    })
    return NextResponse.json({
      success: true,
      data: { ...role, _id: role.id, scope: { type: role.scopeType, organizationId: null } },
    }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
      return NextResponse.json({ code: 'CONFLICT', message: 'A role with this name or slug already exists' }, { status: 400 })
    }
    return NextResponse.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' }, { status: 500 })
  }
}
