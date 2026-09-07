import { NextRequest, NextResponse } from 'next/server'
import { requireActiveUser, ForbiddenError, AuthRequiredError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

export async function POST(request: NextRequest) {
  try {
    await requireActiveUser(request)

    const authHeader = request.headers.get('Authorization') || ''
    const body = await request.json()

    const res = await fetch(`${API_URL}/payments/razorpay/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to verify payment'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
