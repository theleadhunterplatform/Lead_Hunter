import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id } = await params
    const assignment = await db.roleAssignment.findUnique({ where: { id } })
    if (!assignment) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Assignment not found' }, { status: 404 })
    }
    await db.roleAssignment.delete({ where: { id } })
    return NextResponse.json({ success: true, data: {} })
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' }, { status: 500 })
  }
}
