import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireFullyAuthorized,
  AuthRequiredError,
  InactiveUserError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
} from '@/lib/auth'
import { claimPost, getPost } from '@/lib/external-api/client'
import { leadRevealSchema } from '@/lib/validators/auth'
import { rateLimitByKey } from '@/lib/rate-limit'
import { creditService, InsufficientCreditsError } from '@/lib/services/credits'
import { getLeadRevealCost, leadContactBundle } from '@/lib/config/coins'
import { extractNiches, extractCleanNicheTags } from '@/lib/claim-reveal'
import { emailService } from '@/lib/services/email'
import { oracleDb } from '@/lib/oracle-db'
import { mapLeadPostToExternal } from '@/lib/oracle-mapper'
import { invalidateLeadRevealCount } from '@/lib/feed-cache'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const rl = await rateLimitByKey(`user:${userId}:reveal`, 30, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        { status: 429 },
      )
    }
    const body = await request.json()
    const parsed = leadRevealSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { leadId } = parsed.data

    let externalLead: ExternalPost | null = null
    try {
      const rawPost = await oracleDb.leadPost.findUnique({
        where: { id: leadId },
      })
      if (rawPost) {
        externalLead = mapLeadPostToExternal(rawPost as any)
      }
    } catch (e) {
      console.warn('[Reveal POST] Failed to fetch from oracleDb, falling back to getPost:', e)
    }

    if (!externalLead) {
      externalLead = await getPost(leadId)
    }

    const contactBundle = leadContactBundle(externalLead)
    const CREDIT_COST = getLeadRevealCost(externalLead)

    if (CREDIT_COST === null) {
      return NextResponse.json(
        {
          code: 'NO_CONTACT_INFO',
          message: 'No contact info found on this lead. Reveal is not available.',
          contactBundle,
        },
        { status: 400 },
      )
    }

    // Check if already claimed on external API side
    if (externalLead.is_claimed) {
      // Still return the contact info if we have it locally
      const existingState = await db.userLeadState.findUnique({
        where: { userId_leadId: { userId, leadId } },
      })
      if (existingState?.isRevealed) {
        return NextResponse.json({
          success: true,
          isRevealed: true,
          coinsUsed: 0,
          contactBundle,
          name: externalLead.author?.name || 'Unknown',
          email: externalLead.email || externalLead.contact_info?.emails?.[0]?.email || '',
          phone: externalLead.contact_info?.phone_numbers?.[0]?.number || null,
        })
      }
      // External says claimed but we don't have it locally - return the contact info
      return NextResponse.json({
        success: true,
        isRevealed: true,
        coinsUsed: 0,
        contactBundle,
        name: externalLead.author?.name || 'Unknown',
        email: externalLead.email || externalLead.contact_info?.emails?.[0]?.email || '',
        phone: externalLead.contact_info?.phone_numbers?.[0]?.number || null,
      })
    }

    const existingState = await db.userLeadState.findUnique({
      where: {
        userId_leadId: {
          userId,
          leadId,
        },
      },
    })

    if (existingState?.isRevealed) {
      return NextResponse.json({
        success: true,
        isRevealed: true,
        coinsUsed: 0,
        contactBundle,
        name: externalLead.author?.name || 'Unknown',
        email: externalLead.email || externalLead.contact_info?.emails?.[0]?.email || '',
        phone: externalLead.contact_info?.phone_numbers?.[0]?.number || null,
      })
    }

    // Exclusive claim enforcement: verify if 25 other users have already unlocked this lead
    const otherRevealedCount = await db.userLeadState.count({
      where: {
        leadId,
        isRevealed: true,
        userId: { not: userId },
      },
    })

    if (otherRevealedCount >= 25 || (externalLead.claimed_count || 0) >= 25) {
      return NextResponse.json(
        {
          code: 'LEAD_ALREADY_CLAIMED',
          message:
            'This lead has reached its maximum claim limit (25 members).',
        },
        { status: 400 },
      )
    }

    const intel = externalLead.intelligence || ''

    const balance = await creditService.getTotalBalance(userId)
    if (balance < CREDIT_COST) {
      return NextResponse.json(
        {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient credits to reveal lead',
          required: CREDIT_COST,
          available: balance,
        },
        { status: 400 },
      )
    }

    let claimedLead: ExternalPost
    try {
      claimedLead = await claimPost(leadId)
    } catch {
      claimedLead = await getPost(leadId)
      await db.leadPost
        .update({
          where: { id: leadId },
          data: { claimed_count: { increment: 1 } },
        })
        .catch((err: any) => console.warn('[Reveal] Could not increment claimed_count in db:', err))
    }

    const txResult = await db.$transaction(
      async (tx) => {
        // Concurrency Guard 1: Verify if the user already unlocked this lead in a concurrent request
        const currentExisting = await tx.userLeadState.findUnique({
          where: { userId_leadId: { userId, leadId } },
        })
        if (currentExisting?.isRevealed) {
          return {
            alreadyRevealed: true,
            creditsRemaining: balance,
            state: currentExisting,
            name: claimedLead.author?.name || 'Unknown',
            email: claimedLead.email || claimedLead.contact_info?.emails?.[0]?.email || '',
            phone: claimedLead.contact_info?.phone_numbers?.[0]?.number || null,
            coinsUsed: 0,
            contactBundle,
          }
        }

        // Concurrency Guard 2: Atomically verify claim count inside database transaction
        // Ensures no burst of concurrent requests can exceed the strict 25-claim limit
        const currentOtherClaims = await tx.userLeadState.count({
          where: {
            leadId,
            isRevealed: true,
            userId: { not: userId },
          },
        })
        if (currentOtherClaims >= 25) {
          const err = new Error('LEAD_ALREADY_CLAIMED')
          ;(err as any).code = 'LEAD_ALREADY_CLAIMED'
          throw err
        }

        const result = await creditService.deductInTx(tx, userId, CREDIT_COST, 'lead_reveal', {
          leadId,
          coinsUsed: CREDIT_COST,
          contactBundle,
        })

        await tx.lead.upsert({
          where: { id: leadId },
          update: {},
          create: {
            id: leadId,
            name: claimedLead.author?.name || 'Unknown',
            email: claimedLead.email || claimedLead.contact_info?.emails?.[0]?.email || '',
            phone: claimedLead.contact_info?.phone_numbers?.[0]?.number || null,
            company: claimedLead.contact_info?.company_name || claimedLead.author?.name || claimedLead.platform || '',
            source: claimedLead.platform || 'Unknown',
            category: claimedLead.keyword?.replace(/^watchlist:/, '') || claimedLead.platform || 'General',
            title: claimedLead.author?.info || claimedLead.keyword || claimedLead.platform || 'Lead Signal',
            signalContext: claimedLead.content || '',
            role: claimedLead.author?.info || '',
            taskScope: '',
            mustHave: '',
            nicheBonus: '',
            buyerType: intel,
            urgency: 'medium',
            winProb: 'medium',
            nicheTags: extractCleanNicheTags(
              claimedLead,
              extractNiches(claimedLead.keyword, claimedLead.content || '', claimedLead.intelligence),
            ),
            niches: extractNiches(claimedLead.keyword, claimedLead.content || '', claimedLead.intelligence),
            hashtags: [],
            replyProbability: Math.max(claimedLead.ai_score || 0, 60),
            accent: 'mint',
          },
        })

        const updatedState = await tx.userLeadState.upsert({
          where: {
            userId_leadId: {
              userId,
              leadId,
            },
          },
          update: {
            isRevealed: true,
            revealedAt: new Date(),
            isSaved: true,
            status: 'saved',
          },
          create: {
            userId,
            leadId,
            isRevealed: true,
            revealedAt: new Date(),
            isSaved: true,
            status: 'saved',
          },
        })

        const revealedEmail = claimedLead.email || claimedLead.contact_info?.emails?.[0]?.email || ''
        const revealedPhone = claimedLead.contact_info?.phone_numbers?.[0]?.number || null

        return {
          alreadyRevealed: false,
          creditsRemaining: result.subscriptionBalance + result.bonusBalance + result.rolloverBalance,
          state: updatedState,
          name: claimedLead.author?.name || 'Unknown',
          email: revealedEmail,
          phone: revealedPhone,
          coinsUsed: CREDIT_COST,
          contactBundle,
        }
      },
      { timeout: 15000 },
    )

    // Invalidate lead reveal count cache immediately so all concurrent users see the new count
    invalidateLeadRevealCount(leadId)

    if (txResult.alreadyRevealed) {
      return NextResponse.json({
        success: true,
        isRevealed: true,
        coinsUsed: 0,
        contactBundle: txResult.contactBundle,
        name: txResult.name,
        email: txResult.email,
        phone: txResult.phone,
      })
    }

    // Flow 3: Low credits alert if member has <= 2 credits remaining
    if (txResult.creditsRemaining <= 2) {
      ;(async () => {
        try {
          const user = await db.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
          })
          if (user?.email) {
            const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
            const recentAlert = await db.emailLog.findFirst({
              where: {
                to: user.email,
                type: 'low_credits',
                sentAt: { gte: twoDaysAgo },
              },
            })
            if (!recentAlert) {
              await emailService.sendLowCreditsNudge(
                { name: user.name || '', email: user.email },
                txResult.creditsRemaining,
              )
            }
          }
        } catch (e) {
          console.warn('[Lead Reveal] Low credits email check failed:', e)
        }
      })()
    }

    return NextResponse.json({
      success: true,
      isRevealed: true,
      name: txResult.name,
      email: txResult.email,
      phone: txResult.phone,
      creditsRemaining: txResult.creditsRemaining,
      coinsUsed: CREDIT_COST,
      contactBundle,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    if (error instanceof InactiveUserError) {
      return NextResponse.json(
        { code: 'INACTIVE', message: 'Your account is not active' },
        { status: 403 },
      )
    }
    if (error instanceof EmailNotVerifiedError) {
      return NextResponse.json(
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before continuing' },
        { status: 403 },
      )
    }
    if (error instanceof OnboardingRequiredError) {
      return NextResponse.json(
        { code: 'ONBOARDING_REQUIRED', message: 'Please complete onboarding first' },
        { status: 403 },
      )
    }
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient credits to reveal lead',
          required: error.required,
        },
        { status: 400 },
      )
    }
    if (
      error instanceof Error &&
      (error.message === 'LEAD_ALREADY_CLAIMED' || (error as any).code === 'LEAD_ALREADY_CLAIMED')
    ) {
      return NextResponse.json(
        {
          code: 'LEAD_ALREADY_CLAIMED',
          message: 'This lead has reached its maximum claim limit (25 members).',
        },
        { status: 400 },
      )
    }

    console.error('[Lead Reveal API] Full error:', error)
    if (error instanceof Error && error.message.includes('Only admin-approved leads')) {
      return NextResponse.json(
        {
          code: 'LEAD_NOT_APPROVED',
          message: 'This lead has not been approved yet. Intelligence is still being generated. Please check back later.',
        },
        { status: 400 },
      )
    }
    const errMsg = error instanceof Error ? error.message : 'Failed to reveal lead contact info'
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: errMsg },
      { status: 500 },
    )
  }
}

import type { ExternalPost } from '@/lib/external-api/client'
function extractTags(post: ExternalPost): string[] {
  const tags: string[] = []
  const platform = (post.platform || '').toLowerCase()
  const authorName = (post.author?.name || '').toLowerCase()
  const company = (post.contact_info?.company_name || '').toLowerCase()

  if (post.keyword) {
    const rawTag = post.keyword.replace(/^watchlist:/, '')
    const tagLower = rawTag.toLowerCase()
    
    // Filter out platform source, author name, and company name matches
    const isPlatform = tagLower === platform || ['linkedin', 'reddit', 'twitter', 'github', 'seed', 'external'].includes(tagLower)
    const isAuthor = authorName && (authorName.includes(tagLower) || tagLower.includes(authorName))
    const isCompany = company && (company.includes(tagLower) || tagLower.includes(company))

    if (!isPlatform && !isAuthor && !isCompany) {
      tags.push(rawTag)
    }
  }

  return tags
}
