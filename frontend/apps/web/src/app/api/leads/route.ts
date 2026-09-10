import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Lead } from '@prisma/client'
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
import type { AppLead } from '@/types/lead'
import { getLeadRevealCost } from '@/lib/config/coins'
import { extractNiches, sanitizePublicText, extractCleanNicheTags, sanitizeHeadline } from '@/lib/claim-reveal'

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

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(\+?\d[\d\s\-()\/.]{6,}\d)/g

function redactContact(content: string): string {
  return content.replace(EMAIL_REGEX, '[email hidden]').replace(PHONE_REGEX, '[phone hidden]')
}

function isLeadClaimable(post: ExternalPost): boolean {
  return post.source === 'seed' || (post.review_status === 'approved' && !!post.intelligence)
}

function isFeedEligible(post: ExternalPost): boolean {
  if (post.source === 'seed') return false
  if (post.review_status !== 'approved') return false
  if (!post.intelligence) return false
  return true
}

function extractSection(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`#+\\s*\\?*\\s*${escaped}\\s*\\n+([\\s\\S]*?)(?:\\n#+\\s|$)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

function externalPostToAppLead(
  post: ExternalPost,
  userState?: { isSaved: boolean; isRevealed: boolean; status: string } | null,
): AppLead {
  const isRevealed = userState?.isRevealed || false
  const phone = post.contact_info?.phone_numbers?.[0]?.number || null
  const email = post.email || post.contact_info?.emails?.[0]?.email || ''
  const intel = post.intelligence || ''

  const niches = extractNiches(post.keyword, post.content || '', post.intelligence)
  const cleanTags = extractCleanNicheTags(post, niches)
  const cleanTitle = sanitizeHeadline(post.author?.info || post.keyword || '', niches[0])
  const cleanScope = sanitizePublicText(
    extractSection(intel, 'Context You Might Miss') ||
      extractSection(intel, 'What They Actually Want') ||
      extractSection(intel, 'One-Liner') ||
      post.content ||
      '',
  )

  return {
    id: post.id,
    name: isRevealed ? post.author?.name || 'Unknown' : 'Unlocked Contact',
    email: isRevealed ? email : 'unlocked@leadhunterclub.com',
    company: isRevealed
      ? post.contact_info?.company_name || post.author?.name || post.platform || ''
      : 'Confidential Client',
    source: 'Lead Signal',
    category: niches[0] || 'General',
    title: cleanTitle,
    signalContext: isRevealed ? post.content || '' : sanitizePublicText(post.content || ''),
    role: sanitizePublicText(post.author?.info || extractSection(intel, 'One-Liner')),
    taskScope: cleanScope,
    mustHave: sanitizePublicText(extractSection(intel, 'What They Actually Want')),
    nicheBonus: sanitizePublicText(extractSection(intel, 'How to Win')),
    buyerType: sanitizePublicText(intel),
    urgency: 'medium',
    winProb: 'medium',
    nicheTags: cleanTags,
    niches,
    hashtags: [],
    replyProbability: Math.max(post.ai_score || 0, 60),
    accent: 'mint',
    status: (userState?.status || 'new') as AppLead['status'],
    timestamp: post.posted_at?.postedAgoShort || formatTimeAgo(post.created_at),
    isSaved: userState?.isSaved || false,
    isRevealed,
    isClaimable: isLeadClaimable(post),
    hasPhone: !!phone,
    revealCost: getLeadRevealCost(post),
    phone: isRevealed ? phone : null,
  }
}

function dbLeadToAppLead(
  lead: Lead,
  userState?: { isSaved: boolean; isRevealed: boolean; status: string } | null,
): AppLead {
  const isRevealed = userState?.isRevealed || false
  const phone = lead.phone || null
  const email = lead.email || ''

  return {
    id: lead.id,
    name: isRevealed ? lead.name : 'Unlocked Contact',
    email: isRevealed ? email : 'unlocked@leadhunterclub.com',
    company: isRevealed ? lead.company : 'Confidential Client',
    source: lead.source || 'Lead Signal',
    category: lead.category || 'General',
    title: lead.title,
    signalContext: isRevealed ? lead.signalContext : sanitizePublicText(lead.signalContext || ''),
    role: sanitizePublicText(lead.role || ''),
    taskScope: sanitizePublicText(lead.taskScope || ''),
    mustHave: sanitizePublicText(lead.mustHave || ''),
    nicheBonus: sanitizePublicText(lead.nicheBonus || ''),
    buyerType: sanitizePublicText(lead.buyerType || ''),
    urgency: (lead.urgency as AppLead['urgency']) || 'medium',
    winProb: (lead.winProb as AppLead['winProb']) || 'medium',
    nicheTags: lead.nicheTags || [],
    niches: lead.niches || [],
    hashtags: lead.hashtags || [],
    replyProbability: lead.replyProbability || 60,
    accent: (lead.accent as AppLead['accent']) || 'mint',
    status: (userState?.status || 'saved') as AppLead['status'],
    timestamp: formatTimeAgo(lead.createdAt.toISOString()),
    isSaved: userState?.isSaved ?? true,
    isRevealed,
    isClaimable: true,
    hasPhone: !!phone,
    revealCost: 1,
    phone: isRevealed ? phone : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid
    const { searchParams } = new URL(request.url)
    const saved = searchParams.get('saved')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    const isSavedView = saved === 'true'
    const isOutreachView = saved === 'outreach'

    let data: AppLead[]

    if (isSavedView || isOutreachView) {
      const userStates = await db.userLeadState.findMany({
        where: isSavedView
          ? { userId, OR: [{ isSaved: true }, { isRevealed: true }, { status: 'saved' }] }
          : { userId, status: { in: ['drafting', 'sent', 'replied', 'follow-up'] } },
        include: { lead: true },
      })
      data = userStates
        .filter((s) => s.lead && !s.lead.is_deleted)
        .map((s) => externalPostToAppLead(mapLeadPostToExternal(s.lead), s))
    } else {
      let externalLeads: ExternalPost[] = []
      try {
        // Direct Prisma query to oracle schema — no HTTP roundtrip to Oracle VM
        const where = {
          is_deleted: false,
          review_status: 'approved',
          intelligence: { not: null as string | null },
          source: { not: 'seed' },
        }
        const [rawLeads, total] = await Promise.all([
          oracleDb.leadPost.findMany({
            where,
            orderBy: { created_at: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          oracleDb.leadPost.count({ where }),
        ])
        externalLeads = rawLeads.map(mapLeadPostToExternal)
        const leadIds = externalLeads.map((l) => l.id)
        const userStates =
          leadIds.length > 0
            ? await db.userLeadState.findMany({
                where: { userId, leadId: { in: leadIds } },
              })
            : []
        const stateMap = new Map(userStates.map((s) => [s.leadId, s]))
        const data = externalLeads
          .map((lead) => externalPostToAppLead(lead, stateMap.get(lead.id)))
          .filter((l) => l.status === 'new')

        if (search) {
          const q = search.toLowerCase()
          return NextResponse.json({
            data: data.filter(
              (l) =>
                l.title.toLowerCase().includes(q) ||
                l.signalContext.toLowerCase().includes(q) ||
                l.company.toLowerCase().includes(q) ||
                l.category.toLowerCase().includes(q) ||
                l.nicheTags.some((tag) => tag.toLowerCase().includes(q)),
            ),
            pagination: {
              page,
              pageSize,
              total,
              totalPages: Math.ceil(total / pageSize),
              hasNext: page < Math.ceil(total / pageSize),
              hasPrev: page > 1,
            },
          })
        }

        return NextResponse.json({
          data,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
            hasNext: page < Math.ceil(total / pageSize),
            hasPrev: page > 1,
          },
        })
      } catch (oracleErr: unknown) {
        const msg = oracleErr instanceof Error ? oracleErr.message : 'Oracle unreachable'
        console.error('[Leads API] Oracle DB unavailable — returning empty feed:', msg)
        return NextResponse.json({
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
          warning: 'Lead data is temporarily unavailable. Please try again shortly.',
        })
      }
    }

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.signalContext.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          l.nicheTags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }

    const total = data.length
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
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
    if (error instanceof InactiveUserError) {
      return NextResponse.json(
        { code: 'INACTIVE', message: 'Your account is not active' },
        { status: 403 },
      )
    }
    console.error('[Leads API] GET error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve leads' },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json(
    {
      code: 'READ_ONLY',
      message: 'Lead creation is not supported. Leads are read-only from external source.',
    },
    { status: 400 },
  )
}
