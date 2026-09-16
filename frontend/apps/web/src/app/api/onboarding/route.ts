import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireEmailVerified, AuthRequiredError, EmailNotVerifiedError } from '@/lib/auth'
import { onboardingSchema } from '@/lib/validators/auth'
import { emailService } from '@/lib/services/email'
import { normalizePhone } from '@/lib/phone'
import { normalizeSocialUrl, isValidSocialProfile } from '@/lib/social'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireEmailVerified(request)
    if (!authUser) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const parsed = onboardingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid onboarding data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    // Validate LinkedIn profile link is not just a generic homepage
    if (!isValidSocialProfile(parsed.data.linkedin)) {
      return NextResponse.json(
        {
          code: 'INVALID_SOCIAL_LINK',
          message:
            'Please provide a valid direct link to your personal or company LinkedIn profile (e.g. linkedin.com/in/yourname)',
        },
        { status: 400 },
      )
    }

    const existingUser = await db.user.findUnique({ where: { id: authUser.uid } })
    if (!existingUser) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'User not found. Create an account first.' },
        { status: 404 },
      )
    }

    const isAdmin = existingUser.role === 'admin'
    const rawPhone = parsed.data.phone.trim()
    const normalizedPhone = normalizePhone(rawPhone)

    // Strictly enforce 1 single mobile number across accounts via indexed database query
    const duplicatePhoneUser = await db.user.findFirst({
      where: {
        id: { not: authUser.uid },
        OR: [
          { phone: normalizedPhone },
          { phone: rawPhone },
        ],
      },
      select: { id: true },
    })

    if (duplicatePhoneUser) {
      return NextResponse.json(
        {
          code: 'DUPLICATE_PHONE',
          message:
            'This mobile number is already registered with another account. A single mobile number cannot be used for multiple accounts.',
        },
        { status: 400 },
      )
    }

    // Anti-Abuse: Deduplicate social profiles (LinkedIn, Twitter, Portfolio, Instagram, GitHub, etc.)
    const socialFields: Array<keyof typeof parsed.data> = [
      'linkedin',
      'portfolio',
      'website',
      'twitter',
      'instagram',
      'github',
      'dribbble',
      'behance',
    ]

    const normalizedInputs: Record<string, string> = {}
    const searchConditions: Array<Record<string, unknown>> = []

    for (const field of socialFields) {
      const val = parsed.data[field]
      if (typeof val === 'string' && val.trim()) {
        const norm = normalizeSocialUrl(val)
        if (norm && isValidSocialProfile(val)) {
          normalizedInputs[field] = norm
          searchConditions.push(
            { [field]: val.trim() },
            { [field]: norm },
            { [field]: `https://${norm}` },
            { [field]: { contains: norm, mode: 'insensitive' } },
          )
        }
      }
    }

    if (searchConditions.length > 0) {
      const duplicateSocialCandidates = await db.user.findMany({
        where: {
          id: { not: authUser.uid },
          OR: searchConditions as any,
        },
        select: {
          id: true,
          linkedin: true,
          portfolio: true,
          website: true,
          twitter: true,
          instagram: true,
          github: true,
          dribbble: true,
          behance: true,
        },
      })

      const normInputValues = new Set(Object.values(normalizedInputs))
      const hasDuplicateSocial = duplicateSocialCandidates.some((candidate) => {
        for (const field of socialFields) {
          const candidateVal = candidate[field as keyof typeof candidate]
          if (typeof candidateVal === 'string' && candidateVal.trim()) {
            const candidateNorm = normalizeSocialUrl(candidateVal)
            if (candidateNorm && normInputValues.has(candidateNorm)) {
              return true
            }
          }
        }
        return false
      })

      if (hasDuplicateSocial) {
        return NextResponse.json(
          {
            code: 'DUPLICATE_SOCIAL_LINK',
            message:
              'A social media profile provided is already linked to another Lead Hunter account. Each member must register with their own unique profile to prevent credit abuse.',
          },
          { status: 400 },
        )
      }
    }

    const updatedUser = await db.user.update({
      where: { id: authUser.uid },
      data: {
        ...parsed.data,
        phone: normalizedPhone,
        status: isAdmin ? existingUser.status : 'PENDING',
      },
    })

    emailService.sendOnboardingComplete({ name: updatedUser.name, email: updatedUser.email })
    emailService.notifyAdmin('New Application', {
      name: updatedUser.name,
      email: updatedUser.email,
      id: updatedUser.id,
    })

    return NextResponse.json({
      data: {
        id: updatedUser.id,
        status: updatedUser.status,
      },
    })
  } catch (error) {
    if (error instanceof EmailNotVerifiedError) {
      return NextResponse.json(
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before continuing' },
        { status: 403 },
      )
    }
    if (error instanceof AuthRequiredError) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    console.error('[Onboarding API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}
