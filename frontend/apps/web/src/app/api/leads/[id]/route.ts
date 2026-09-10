import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireFullyAuthorized,
  AuthRequiredError,
  InactiveUserError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
} from '@/lib/auth'
import { getPost, claimPost } from '@/lib/external-api/client'
import type { ExternalPost } from '@/lib/external-api/client'
import { oracleDb } from '@/lib/oracle-db'
import { mapLeadPostToExternal } from '@/lib/oracle-mapper'
import { updateLeadSchema } from '@/lib/validators/auth'
import type { AppLead } from '@/types/lead'
import { extractNiches, sanitizePublicText, extractCleanNicheTags, sanitizeHeadline } from '@/lib/claim-reveal'
import { getLeadRevealCost } from '@/lib/config/coins'
import { creditService } from '@/lib/services/credits'

export const dynamic = 'force-dynamic'

function formatTimeAgo(dateStr: string): string {
  const diffMs = new Date().getTime() - new Date(dateStr).getTime()
  const seconds = Math.max(0, Math.floor(diffMs / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function extractSection(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`#+\\s*\\?*\\s*${escaped}\\s*\\n+([\\s\\S]*?)(?:\\n#+\\s|$)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(\+?\d[\d\s\-()\/.]{6,}\d)/g

function redactContact(content: string): string {
  return content.replace(EMAIL_REGEX, '[email hidden]').replace(PHONE_REGEX, '[phone hidden]')
}

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const rawLead = await oracleDb.leadPost.findUnique({ where: { id: params.id } })
    if (!rawLead) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Lead not found' }, { status: 404 })
    }
    const externalLead = mapLeadPostToExternal(rawLead)

    const userState = await db.userLeadState.findUnique({
      where: {
        userId_leadId: {
          userId,
          leadId: params.id,
        },
      },
    })

    const isRevealed = userState?.isRevealed || false
    const phone = externalLead.contact_info?.phone_numbers?.[0]?.number || null
    const email = externalLead.email || externalLead.contact_info?.emails?.[0]?.email || ''
    const isClaimable = externalLead.source === 'seed' || (externalLead.review_status === 'approved' && !!externalLead.intelligence)
    const intel = externalLead.intelligence || ''

    const niches = extractNiches(externalLead.keyword, externalLead.content || '', externalLead.intelligence)
    const cleanTags = extractCleanNicheTags(externalLead, niches)
    const cleanTitle = sanitizeHeadline(externalLead.author?.info || externalLead.keyword || '', niches[0])
    const cleanScope = sanitizePublicText(
      extractSection(intel, 'Context You Might Miss') ||
        extractSection(intel, 'What They Actually Want') ||
        extractSection(intel, 'One-Liner') ||
        externalLead.content ||
        '',
    )

    const lead: AppLead = {
      id: externalLead.id,
      name: isRevealed ? externalLead.author?.name || 'Unknown' : 'Unlocked Contact',
      email: isRevealed
        ? externalLead.email || externalLead.contact_info?.emails?.[0]?.email || ''
        : 'unlocked@leadhunterclub.com',
      company: isRevealed
        ? externalLead.contact_info?.company_name ||
          externalLead.author?.name ||
          externalLead.platform ||
          ''
        : 'Confidential Client',
      source: 'Lead Signal',
      category: niches[0] || 'General',
      title: cleanTitle,
      signalContext: isRevealed ? externalLead.content || '' : sanitizePublicText(externalLead.content || ''),
      role: sanitizePublicText(externalLead.author?.info || extractSection(intel, 'One-Liner')),
      taskScope: cleanScope,
      mustHave: sanitizePublicText(extractSection(intel, 'What They Actually Want')),
      nicheBonus: sanitizePublicText(extractSection(intel, 'How to Win')),
      buyerType: sanitizePublicText(intel),
      urgency: 'medium',
      winProb: 'medium',
      nicheTags: cleanTags,
      niches,
      hashtags: [],
      replyProbability: Math.max(externalLead.ai_score || 0, 60),
      accent: 'mint',
      status: (userState?.status || 'new') as AppLead['status'],
      timestamp: externalLead.posted_at?.postedAgoShort || formatTimeAgo(externalLead.created_at),
      isSaved: userState?.isSaved || false,
      isRevealed,
      isClaimable,
      hasPhone: !!phone,
      revealCost: getLeadRevealCost(externalLead),
      phone: isRevealed ? phone : null,
    }

    return NextResponse.json({ data: lead })
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
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address first' },
        { status: 403 },
      )
    }
    if (error instanceof OnboardingRequiredError) {
      return NextResponse.json(
        { code: 'ONBOARDING_REQUIRED', message: 'Please complete onboarding first' },
        { status: 403 },
      )
    }
    console.error('[Lead GET API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve lead details' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const body = await request.json()
    const parsed = updateLeadSchema.safeParse(body)
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

    const { status, isSaved } = parsed.data
    const updateData: Record<string, string | boolean | Date> = {}
    if (status !== undefined) updateData.status = status
    if (isSaved !== undefined) updateData.isSaved = isSaved

    if (isSaved === true && status === undefined) {
      updateData.status = 'saved'
    } else if (isSaved === false && status === 'saved') {
      updateData.status = 'new'
    }

    // Step 1 Unified Flow: Saving a lead always unlocks the lead and deducts credits
    if (isSaved === true || status === 'saved') {
      const existingState = await db.userLeadState.findUnique({
        where: { userId_leadId: { userId, leadId: params.id } },
      })

      if (!existingState?.isRevealed) {
        const rawLead = await oracleDb.leadPost.findUnique({ where: { id: params.id } })
        if (!rawLead) {
          return NextResponse.json({ code: 'NOT_FOUND', message: 'Lead not found' }, { status: 404 })
        }
        const externalLead = mapLeadPostToExternal(rawLead)
        const cost = getLeadRevealCost(externalLead) ?? 3

        const balance = await creditService.getTotalBalance(userId)
        if (balance < cost) {
          return NextResponse.json(
            {
              code: 'INSUFFICIENT_CREDITS',
              message: `Insufficient credits to save and unlock this lead (needs ${cost} credits, available: ${balance})`,
              required: cost,
              available: balance,
            },
            { status: 400 },
          )
        }

        await claimPost(params.id).catch((err) => {
          console.warn('[Lead Save] Backend claim notification failed:', err?.message || err)
          return externalLead
        })

        const txResult = await db.$transaction(async (tx) => {
          const deductRes = await creditService.deductInTx(tx, userId, cost, 'lead_save', {
            leadId: params.id,
            coinsUsed: cost,
          })

          const userState = await tx.userLeadState.upsert({
            where: {
              userId_leadId: {
                userId,
                leadId: params.id,
              },
            },
            update: {
              isSaved: true,
              status: 'saved',
              isRevealed: true,
              revealedAt: new Date(),
            },
            create: {
              userId,
              leadId: params.id,
              isSaved: true,
              status: 'saved',
              isRevealed: true,
              revealedAt: new Date(),
            },
          })

          return {
            userState,
            creditsRemaining: deductRes.subscriptionBalance + deductRes.bonusBalance,
          }
        })

        return NextResponse.json({
          data: {
            leadId: params.id,
            status: txResult.userState.status,
            isSaved: txResult.userState.isSaved,
            isRevealed: txResult.userState.isRevealed,
            creditsRemaining: txResult.creditsRemaining,
          },
        })
      }
    }

    if (isSaved === true || (status && status !== 'new')) {
      const leadExists = await db.leadPost.findUnique({
        where: { id: params.id },
        select: { id: true },
      })
      if (!leadExists) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'Lead not found' }, { status: 404 })
      }
    }

    const userState = await db.userLeadState.upsert({
      where: {
        userId_leadId: {
          userId,
          leadId: params.id,
        },
      },
      update: updateData,
      create: {
        userId,
        leadId: params.id,
        status: (updateData.status as string) || 'new',
        isSaved: (updateData.isSaved as boolean) || false,
      },
    })

    return NextResponse.json({
      data: {
        leadId: params.id,
        status: userState.status,
        isSaved: userState.isSaved,
        isRevealed: userState.isRevealed,
      },
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
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address first' },
        { status: 403 },
      )
    }
    if (error instanceof OnboardingRequiredError) {
      return NextResponse.json(
        { code: 'ONBOARDING_REQUIRED', message: 'Please complete onboarding first' },
        { status: 403 },
      )
    }
    console.error('[Lead PATCH API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update lead status' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    await db.userLeadState.deleteMany({
      where: {
        userId,
        leadId: params.id,
      },
    })

    return new NextResponse(null, { status: 204 })
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
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address first' },
        { status: 403 },
      )
    }
    if (error instanceof OnboardingRequiredError) {
      return NextResponse.json(
        { code: 'ONBOARDING_REQUIRED', message: 'Please complete onboarding first' },
        { status: 403 },
      )
    }
    console.error('[Lead DELETE API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete lead' },
      { status: 500 },
    )
  }
}
