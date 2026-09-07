import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const token = searchParams.get('token')

    if (!email || !token) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'email and token are required' },
        { status: 400 },
      )
    }

    const subscriber = await db.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (!subscriber || subscriber.unsubscribeToken !== token) {
      return NextResponse.json(
        { code: 'INVALID_TOKEN', message: 'Invalid confirmation link' },
        { status: 400 },
      )
    }

    await db.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'SUBSCRIBED' },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[Newsletter Confirm] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to confirm subscription' },
      { status: 500 },
    )
  }
}