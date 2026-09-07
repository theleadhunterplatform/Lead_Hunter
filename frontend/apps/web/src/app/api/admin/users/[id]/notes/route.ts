import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError } from '@/lib/auth'
import { adminNoteSchema } from '@/lib/validators/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request)
    const { id: targetUserId } = await params

    const notes = await db.adminNote.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const adminIds = [...new Set(notes.map((n) => n.adminId))]
    const admins = await db.user.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, name: true },
    })
    const adminMap = new Map(admins.map((a) => [a.id, a.name]))

    const notesWithAdmin = notes.map((n) => ({
      id: n.id,
      content: n.content,
      adminName: adminMap.get(n.adminId) || 'Unknown',
      createdAt: n.createdAt.toISOString(),
    }))

    return NextResponse.json({ data: notesWithAdmin })
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
    console.error('[Admin Notes API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAdmin(request)
    const { id: targetUserId } = await params

    const body = await request.json()
    const parsed = adminNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { content } = parsed.data

    const user = await db.user.findUnique({ where: { id: targetUserId } })
    if (!user) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
    }

    const note = await db.adminNote.create({
      data: {
        userId: targetUserId,
        adminId: authUser.uid,
        content: content.trim(),
      },
    })

    const admin = await db.user.findUnique({
      where: { id: authUser.uid },
      select: { name: true },
    })

    return NextResponse.json({
      data: {
        id: note.id,
        content: note.content,
        adminName: admin?.name || 'Unknown',
        createdAt: note.createdAt.toISOString(),
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
    console.error('[Admin Notes API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}
