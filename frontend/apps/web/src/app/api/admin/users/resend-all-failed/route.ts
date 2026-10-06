import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { emailService } from '@/lib/services/email'
import { getPlan } from '@/lib/config/plans'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key')
  const validKey = process.env.ADMIN_REGISTRATION_KEY || 'leadhunter-admin-2026'

  let authorized = adminKey === validKey
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

  // 1. Fetch all ACTIVE users
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
    // Check if user already has a SENT approved email
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

    // Has no SENT log (either failed or never sent) -> dispatch now!
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

    // Brief delay to prevent rate-limiting on SMTP relay
    await new Promise((r) => setTimeout(r, 600))
  }

  return NextResponse.json({
    success: true,
    totalActive: activeUsers.length,
    resentCount: results.filter((r) => r.status === 'SENT').length,
    results,
  })
}
