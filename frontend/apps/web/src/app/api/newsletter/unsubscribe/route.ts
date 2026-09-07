import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/services/email'

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

    const result = await emailService.unsubscribeSubscriber(email.toLowerCase(), token)
    if (!result.ok) {
      return NextResponse.json(
        { code: 'INVALID_TOKEN', message: 'Invalid unsubscribe link' },
        { status: 400 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[Newsletter Unsubscribe] error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to unsubscribe' },
      { status: 500 },
    )
  }
}