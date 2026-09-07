import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { statusSchema } from '@/lib/validators/newsletter'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const parsed = statusSchema.safeParse({ email })
    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid email' },
        { status: 400 },
      )
    }

    const subscriber = await db.newsletterSubscriber.findUnique({
      where: { email: parsed.data.email },
      select: { status: true },
    })

    return NextResponse.json({
      subscribed: subscriber?.status === 'SUBSCRIBED',
    })
  } catch (error: unknown) {
    console.error('[Newsletter Status] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to check subscription' },
      { status: 500 },
    )
  }
}