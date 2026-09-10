import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { arePhonesMatching, getPhoneDigits } from '@/lib/phone'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request).catch(() => null)
    const body = await request.json().catch(() => ({}))
    const rawPhone = (body.phone || '').trim()

    if (!rawPhone || getPhoneDigits(rawPhone).length < 7) {
      return NextResponse.json({ isAvailable: true })
    }

    const otherUsers = await db.user.findMany({
      where: {
        ...(authUser?.uid ? { id: { not: authUser.uid } } : {}),
        phone: { not: null },
      },
      select: { id: true, phone: true },
    })

    const isDuplicate = otherUsers.some((u) => arePhonesMatching(u.phone, rawPhone))

    return NextResponse.json({
      isAvailable: !isDuplicate,
      message: isDuplicate
        ? 'This mobile number is already registered with another account. 1 single mobile number cannot be used for multiple accounts.'
        : null,
    })
  } catch (error) {
    console.error('[Check Phone API] Error:', error)
    return NextResponse.json({ isAvailable: true }, { status: 200 })
  }
}
