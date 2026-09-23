import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireFullyAuthorized,
  AuthRequiredError,
  InactiveUserError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
} from '@/lib/auth'
import { getPost } from '@/lib/external-api/client'
import type { ExternalPost } from '@/lib/external-api/client'
import { oracleDb } from '@/lib/oracle-db'
import { mapLeadPostToExternal } from '@/lib/oracle-mapper'
import { updateLeadSchema } from '@/lib/validators/auth'
import type { AppLead } from '@/types/lead'
import {
  extractNiches,
  sanitizePublicText,
  extractCleanNicheTags,
  extractLeadBadges,
  extractLeadSummaries,
  sanitizeHeadline,
} from '@/lib/claim-reveal'
import { getLeadRevealCost } from '@/lib/config/coins'

export const dynamic = 'force-dynamic'

function resolveOriginalPostDate(post: ExternalPost): string {
  const raw = post.posted_at?.date
  if (raw) {
    const t = new Date(raw).getTime()
    if (!Number.isNaN(t)) return new Date(t).toISOString()
  }
  const ts = post.posted_at?.timestamp
  if (typeof ts === 'number' && ts > 0) {
    const ms = ts < 1e12 ? ts * 1000 : ts
    return new Date(ms).toISOString()
  }
  return post.created_at
}

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

const LEAD_POST_SELECT = {
  id: true,
  post_id: true,
  url: true,
  content: true,
  platform: true,
  author: true,
  posted_at: true,
  engagement: true,
  keyword: true,
  keyword_id: true,
  status: true,
  source: true,
  image_url: true,
  ai_score: true,
  is_training_data: true,
  is_deleted: true,
  email: true,
  contact_info: true,
  source_type: true,
  source_profile: true,
  qualification_reason: true,
  enrichment_status: true,
  enrichment_message: true,
  enriched_at: true,
  intelligence: true,
  title: true,
  niche: true,
  review_status: true,
  reviewed_at: true,
  reviewed_by_id: true,
  claimed_count: true,
  credit_cost: true,
  created_at: true,
  updated_at: true,
} as const

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    let externalLead: ExternalPost | null = null
    try {
      const rawPost = await oracleDb.leadPost.findUnique({
        where: { id: params.id },
        select: LEAD_POST_SELECT,
      })
      if (rawPost) {
        externalLead = mapLeadPostToExternal(rawPost as any)
      }
    } catch (e) {
      console.warn('[Lead GET] Failed to fetch from oracleDb, falling back to getPost:', e)
    }

    if (!externalLead) {
      externalLead = await getPost(params.id)
    }

    const [userState, otherRevealed] = await Promise.all([
      db.userLeadState.findUnique({
        where: {
          userId_leadId: {
            userId,
            leadId: params.id,
          },
        },
      }),
      db.userLeadState.findFirst({
        where: {
          leadId: params.id,
          isRevealed: true,
          userId: { not: userId },
        },
        select: { id: true },
      }),
    ])

    const isRevealed = userState?.isRevealed || false
    const isClaimedByOther = !!otherRevealed
    const phone = externalLead.contact_info?.phone_numbers?.[0]?.number || null
    const email = externalLead.email || externalLead.contact_info?.emails?.[0]?.email || ''
    const isClaimable = isClaimedByOther
      ? false
      : externalLead.source === 'seed' ||
        (externalLead.review_status === 'approved' && !!externalLead.intelligence)
    const intel = externalLead.intelligence || ''
    const primaryNiche = externalLead.niche || null

    const niches = extractNiches(
      externalLead.keyword,
      externalLead.content || '',
      externalLead.intelligence,
      primaryNiche,
    )
    const cleanTags = extractLeadBadges(externalLead, niches)
    const resolvedNiche = primaryNiche || niches[0] || 'General'
    const cleanTitle =
      externalLead.title?.trim() ||
      sanitizeHeadline(externalLead.author?.info || externalLead.keyword || '', resolvedNiche)
    const { summary, detailsSummary } = extractLeadSummaries(externalLead)

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
      category: resolvedNiche,
      niche: resolvedNiche,
      title: cleanTitle,
      signalContext: isRevealed ? externalLead.content || '' : sanitizePublicText(externalLead.content || ''),
      role: sanitizePublicText(externalLead.author?.info || extractSection(intel, 'One-Liner')),
      taskScope: summary,
      summary,
      detailsSummary,
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
      timestamp: externalLead.posted_at?.postedAgoShort || formatTimeAgo(resolveOriginalPostDate(externalLead)),
      scrapedAt: resolveOriginalPostDate(externalLead),
      scrapedAgo: formatTimeAgo(resolveOriginalPostDate(externalLead)),
      isSaved: userState?.isSaved || false,
      isRevealed,
      isClaimable,
      isClaimedByOther,
      hasPhone: !isClaimedByOther && !!phone,
      creditCost: (externalLead as any).credit_cost ?? null,
      revealCost: isClaimedByOther ? null : getLeadRevealCost(externalLead),
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
    const updateData: Record<string, string | boolean> = {}
    if (status !== undefined) updateData.status = status
    if (isSaved !== undefined) updateData.isSaved = isSaved

    if (isSaved === true && status === undefined) {
      updateData.status = 'saved'
    } else if (isSaved === false && status === 'saved') {
      updateData.status = 'new'
    }

    const ensureLeadRecord = async () => {
      try {
        const ext = await getPost(params.id)
        await db.lead.upsert({
          where: { id: params.id },
          update: {
            name: ext.author?.name || 'Unknown',
            email: ext.email || ext.contact_info?.emails?.[0]?.email || '',
            phone: ext.contact_info?.phone_numbers?.[0]?.number || null,
            company: ext.contact_info?.company_name || ext.author?.name || ext.platform || '',
            source: ext.platform || 'Unknown',
            category: ext.keyword?.replace(/^watchlist:/, '') || ext.platform || 'General',
            title: ext.author?.info || ext.keyword || ext.platform || 'Lead Signal',
            signalContext: ext.content || '',
            role: ext.author?.info || '',
            taskScope: '',
            mustHave: '',
            nicheBonus: '',
            buyerType: '',
            urgency: 'medium',
            winProb: 'medium',
            nicheTags: [],
            niches: [],
            hashtags: [],
            replyProbability: Math.max(ext.ai_score || 0, 60),
            accent: 'mint',
          },
          create: {
            id: params.id,
            name: ext.author?.name || 'Unknown',
            email: ext.email || ext.contact_info?.emails?.[0]?.email || '',
            phone: ext.contact_info?.phone_numbers?.[0]?.number || null,
            company: ext.contact_info?.company_name || ext.author?.name || ext.platform || '',
            source: ext.platform || 'Unknown',
            category: ext.keyword?.replace(/^watchlist:/, '') || ext.platform || 'General',
            title: ext.author?.info || ext.keyword || ext.platform || 'Lead Signal',
            signalContext: ext.content || '',
            role: ext.author?.info || '',
            taskScope: '',
            mustHave: '',
            nicheBonus: '',
            buyerType: '',
            urgency: 'medium',
            winProb: 'medium',
            nicheTags: [],
            niches: [],
            hashtags: [],
            replyProbability: Math.max(ext.ai_score || 0, 60),
            accent: 'mint',
          },
        })
      } catch (e) {
        console.warn('[Lead PATCH] getPost failed, creating minimal Lead:', e)
        await db.lead.upsert({
          where: { id: params.id },
          update: { name: 'Unknown', email: '', company: '', source: '', category: '', title: '', signalContext: '', role: '', taskScope: '', mustHave: '', nicheBonus: '', buyerType: '', urgency: 'medium', winProb: 'medium', nicheTags: [], niches: [], hashtags: [], replyProbability: 0, accent: 'mint' },
          create: { id: params.id, name: 'Unknown', email: '', company: '', source: '', category: '', title: '', signalContext: '', role: '', taskScope: '', mustHave: '', nicheBonus: '', buyerType: '', urgency: 'medium', winProb: 'medium', nicheTags: [], niches: [], hashtags: [], replyProbability: 0, accent: 'mint' },
        })
      }
    }

    if (isSaved === true || (status && status !== 'new')) {
      const existing = await db.lead.findUnique({
        where: { id: params.id },
        select: { id: true },
      })
      if (!existing) {
        try {
          await ensureLeadRecord()
        } catch (e) {
          console.warn('[Lead PATCH] ensureLeadRecord failed, creating fallback Lead:', e)
          await db.lead.upsert({
            where: { id: params.id },
            update: {},
            create: {
              id: params.id,
              name: 'Unknown', email: '', company: '', source: '', category: '',
              title: '', signalContext: '', role: '', taskScope: '', mustHave: '',
              nicheBonus: '', buyerType: '', urgency: 'medium', winProb: 'medium',
              nicheTags: [], niches: [], hashtags: [], replyProbability: 0, accent: 'mint',
            },
          })
        }
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
