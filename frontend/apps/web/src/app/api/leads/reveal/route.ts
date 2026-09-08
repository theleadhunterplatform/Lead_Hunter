import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireFullyAuthorized,
  AuthRequiredError,
  InactiveUserError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
} from '@/lib/auth'
import { claimPost, getPost, ExternalApiError } from '@/lib/external-api/client'
import { oracleDb } from '@/lib/oracle-db'
import { mapLeadPostToExternal } from '@/lib/oracle-mapper'
import { leadRevealSchema } from '@/lib/validators/auth'
import { rateLimitByKey } from '@/lib/rate-limit'
import { creditService, InsufficientCreditsError } from '@/lib/services/credits'
import { getLeadRevealCost, leadContactBundle } from '@/lib/config/coins'
import { extractNiches, extractCleanNicheTags } from '@/lib/claim-reveal'

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

    const rawLead = await oracleDb.leadPost.findUnique({ where: { id: leadId } })
    if (!rawLead) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Lead not found' }, { status: 404 })
    }
    const externalLead = mapLeadPostToExternal(rawLead)

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

    const claimedLead = await claimPost(leadId).catch((err) => {
      // If backend rejects for token reasons, still proceed — credits already deducted on our side
      if (err instanceof ExternalApiError && (err.status === 403 || err.status === 400)) {
        console.warn('[Lead Reveal] Backend claim soft-error (token check):', err.externalMessage)
        return externalLead // fall back to the lead data we already have
      }
      throw err
    })

    const txResult = await db.$transaction(
      async (tx) => {
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
