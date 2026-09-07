import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getAdminAuthInstance } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request)

    const { uid } = authUser

    const user = await db.user.findUnique({ where: { id: uid } })
    if (!user) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'User not found' }, { status: 404 })
    }

    await db.$transaction([
      db.crmActivity.deleteMany({ where: { userId: uid } }),
      db.crmNote.deleteMany({ where: { userId: uid } }),
      db.adminNote.deleteMany({ where: { userId: uid } }),
      db.auditLog.deleteMany({ where: { userId: uid } }),
      db.userLeadState.deleteMany({ where: { userId: uid } }),
      db.creditAccount.deleteMany({ where: { userId: uid } }),
      db.user.update({
        where: { id: uid },
        data: {
          name: 'Deleted User',
          email: `deleted-${uid.slice(0, 8)}@anonymized.local`,
          phone: null,
          portfolio: null,
          website: null,
          linkedin: null,
          instagram: null,
          servicesOffered: [],
          preferredLeadCategories: [],
          outreachExperience: null,
          discoverySource: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          status: 'REJECTED',
        },
      }),
    ])

    try {
      const authInstance = await getAdminAuthInstance()
      await authInstance.deleteUser(uid)
    } catch {
      // Firebase user may already be deleted or admin creds not configured
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthRequiredError') {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    console.error('[Account Delete API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete account' },
      { status: 500 },
    )
  }
}
