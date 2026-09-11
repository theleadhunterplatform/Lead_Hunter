import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByKey } from '@/lib/rate-limit'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function isKeyValid(candidate: string | null | undefined): boolean {
  const validKey = process.env.ADMIN_REGISTRATION_KEY
  if (!candidate || !validKey) return false
  const candidateBuf = Buffer.from(candidate)
  const validBuf = Buffer.from(validKey)
  if (candidateBuf.length !== validBuf.length) return false
  return crypto.timingSafeEqual(candidateBuf, validBuf)
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitByKey(`ip:${ip}:admin-validate`, 5, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ code: 'RATE_LIMITED', message: 'Too many attempts.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const key = body.key

  if (!key) {
    return NextResponse.json({ code: 'MISSING_KEY', message: 'Registration key is required' }, { status: 400 })
  }

  if (!isKeyValid(key)) {
    return NextResponse.json({ code: 'INVALID_KEY', message: 'Invalid registration key' }, { status: 403 })
  }

  return NextResponse.json({ valid: true })
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitByKey(`ip:${ip}:admin-validate`, 5, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
      { status: 429 },
    )
  }

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (!key) {
    return NextResponse.json(
      { code: 'MISSING_KEY', message: 'Registration key is required' },
      { status: 400 },
    )
  }

  if (!isKeyValid(key)) {
    return NextResponse.json(
      { code: 'INVALID_KEY', message: 'Invalid registration key' },
      { status: 403 },
    )
  }

  return NextResponse.json({ valid: true })
}
