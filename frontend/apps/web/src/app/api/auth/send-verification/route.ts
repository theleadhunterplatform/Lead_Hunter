import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getAdminAuthInstance } from '@/lib/firebase-admin'
import { rateLimitByKey } from '@/lib/rate-limit'
import { emailService } from '@/lib/services/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // Rate limit by IP: max 10 requests per 10 minutes
    const ipRl = await rateLimitByKey(`ip:send-verification:${ip}`, 10, 10 * 60_000)
    if (!ipRl.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Too many verification attempts. Please wait a few minutes.' },
        { status: 429 },
      )
    }

    const authUser = await getAuthUser(request)
    let targetEmail = authUser?.email
    let targetName = authUser?.name

    if (!targetEmail) {
      try {
        const body = await request.json()
        if (body && typeof body.email === 'string') {
          targetEmail = body.email.trim().toLowerCase()
        }
      } catch {
        // no body or non-JSON
      }
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      return NextResponse.json(
        { code: 'BAD_REQUEST', message: 'A valid email address or authentication token is required.' },
        { status: 400 },
      )
    }

    // Rate limit per target email: max 4 requests per 10 minutes
    const emailRl = await rateLimitByKey(
      `target:send-verification:${targetEmail.toLowerCase()}`,
      4,
      10 * 60_000,
    )
    if (!emailRl.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Too many verification requests for this email. Please wait a few minutes.' },
        { status: 429 },
      )
    }

    // Check if email sending infrastructure is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        data: { success: false, fallback: true, message: 'Server email sender not configured, falling back to client.' },
      })
    }

    let adminAuth: any
    try {
      adminAuth = await getAdminAuthInstance()
    } catch {
      return NextResponse.json({
        data: { success: false, fallback: true, message: 'Firebase Admin not configured, falling back to client.' },
      })
    }

    // Verify user status in Firebase Auth
    try {
      const fbUser = await adminAuth.getUserByEmail(targetEmail)
      if (fbUser.emailVerified) {
        return NextResponse.json({
          data: { success: true, message: 'Email is already verified.' },
        })
      }
      if (!targetName && fbUser.displayName) {
        targetName = fbUser.displayName
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      if (firebaseError?.code === 'auth/user-not-found') {
        // Prevent email enumeration
        return NextResponse.json({
          data: { success: true, message: 'If this email is registered, a verification link has been sent.' },
        })
      }
      throw err
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://leadhunterclub.com'
    const actionCodeSettings = {
      url: `${appUrl}/verify-email?verified=true`,
      handleCodeInApp: false,
    }

    const verificationLink = await adminAuth.generateEmailVerificationLink(targetEmail, actionCodeSettings)

    const sendResult = await emailService.sendEmailVerification(
      { name: targetName || '', email: targetEmail },
      verificationLink,
    )

    if (sendResult.id === 'error') {
      return NextResponse.json({
        data: { success: false, fallback: true, message: 'Email dispatch failed, falling back to client.' },
      })
    }

    return NextResponse.json({
      data: { success: true, message: 'Verification email sent successfully.' },
    })
  } catch (error) {
    console.warn('[Send Verification API] Non-fatal error, falling back to client:', error)
    return NextResponse.json({
      data: { success: false, fallback: true, message: 'Verification request falling back to client.' },
    })
  }
}
