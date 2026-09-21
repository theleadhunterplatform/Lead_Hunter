import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { adminRegisterSchema } from '@/lib/validators/auth'
import { rateLimitByKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitByKey(`ip:${ip}:admin-register`, 5, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const parsed = adminRegisterSchema.safeParse(body)
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

    const { key } = parsed.data

    const validKey = process.env.ADMIN_REGISTRATION_KEY
    if (!validKey || key !== validKey) {
      return NextResponse.json(
        { code: 'INVALID_KEY', message: 'Invalid registration key' },
        { status: 403 },
      )
    }

    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated. Sign up first.' },
        { status: 401 },
      )
    }

    const { uid, email, name } = authUser

    // Auto-create the user if they don't exist yet (admin + ACTIVE directly)
    let user = await db.user.findUnique({
      where: { id: uid },
      include: { creditAccount: { select: { id: true } } },
    })
    if (!user) {
      const renewalDate = new Date()
      renewalDate.setDate(renewalDate.getDate() + 30)

      user = await db.user.create({
        data: {
          id: uid,
          email: email || '',
          name: name || 'Admin User',
          role: 'admin',
          status: 'ACTIVE',
          creditAccount: {
            create: { subscriptionBalance: 200, bonusBalance: 0, renewalDate },
          },
        },
        include: { creditAccount: { select: { id: true } } },
      })

      return NextResponse.json({
        data: { id: user.id, role: 'admin', status: 'ACTIVE' },
      })
    }

    if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'This account is not eligible for admin registration' },
        { status: 403 },
      )
    }

    if (user.role === 'admin') {
      return NextResponse.json({ data: { id: user.id, role: 'admin', status: user.status } })
    }

    const updated = await db.user.update({
      where: { id: uid },
      data: { role: 'admin', status: 'ACTIVE' },
      select: { id: true, role: true, status: true },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[Admin Register API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}
