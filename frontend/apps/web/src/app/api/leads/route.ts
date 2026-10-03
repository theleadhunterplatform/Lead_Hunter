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
import {
  extractNiches,
  sanitizePublicText,
  extractCleanNicheTags,
  extractLeadBadges,
  extractLeadSummaries,
  sanitizeHeadline,
} from '@/lib/claim-reveal'

import {
  getCachedFeed,
  setCachedFeed,
  getCachedRevealCounts,
  setCachedRevealCounts,
} from '@/lib/feed-cache'
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
  isClaimedByOther: boolean = false,
): AppLead {
  const isRevealed = userState?.isRevealed || false
  const phone = post.contact_info?.phone_numbers?.[0]?.number || null
  const email = post.email || post.contact_info?.emails?.[0]?.email || ''
  const intel = post.intelligence || ''
  const primaryNiche = post.niche || null

  const niches = extractNiches(post.keyword, post.content || '', post.intelligence, primaryNiche)
  const cleanTags = extractLeadBadges(post, niches)
  const resolvedNiche = primaryNiche || niches[0] || 'General'
  const cleanTitle = post.title?.trim() || sanitizeHeadline(post.author?.info || post.keyword || '', resolvedNiche)
  const { summary, detailsSummary } = extractLeadSummaries(post)

  return {
    id: post.id,
    name: isRevealed ? post.author?.name || 'Unknown' : 'Unlocked Contact',
    email: isRevealed ? email : 'unlocked@leadhunterclub.com',
    company: isRevealed
      ? post.contact_info?.company_name || post.author?.name || post.platform || ''
      : 'Confidential Client',
    source: 'Lead Signal',
    category: resolvedNiche,
    niche: resolvedNiche,
    title: cleanTitle,
    signalContext: isRevealed ? post.content || '' : sanitizePublicText(post.content || ''),
    role: sanitizePublicText(post.author?.info || extractSection(intel, 'One-Liner')),
    taskScope: summary,
    summary,
    detailsSummary,
    mustHave: sanitizePublicText(extractSection(intel, 'What They Actually Want') || detailsSummary),
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
    timestamp: formatTimeAgo(post.reviewed_at || post.updated_at || post.created_at),
    scrapedAt: post.created_at,
    scrapedAgo: formatTimeAgo(post.created_at),
    reviewedAt: post.reviewed_at || null,
    approvedAt: post.reviewed_at || post.updated_at || post.created_at,
    claimedCount: post.claimed_count || 0,
    isSaved: userState?.isSaved || false,
    isRevealed,
    isClaimable: (isClaimedByOther || (!isRevealed && ((post.claimed_count || 0) >= 25 || post.is_claimed))) ? false : isLeadClaimable(post),
    isClaimedByOther: isClaimedByOther || (!isRevealed && ((post.claimed_count || 0) >= 25 || post.is_claimed)),
    hasPhone: !(isClaimedByOther || (!isRevealed && ((post.claimed_count || 0) >= 25 || post.is_claimed))) && !!phone,
    creditCost: (post as any).credit_cost ?? null,
    revealCost: (isClaimedByOther || (!isRevealed && ((post.claimed_count || 0) >= 25 || post.is_claimed))) ? null : getLeadRevealCost(post),
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
  const resolvedNiche = lead.category || 'General'

  return {
    id: lead.id,
    name: isRevealed ? lead.name : 'Unlocked Contact',
    email: isRevealed ? email : 'unlocked@leadhunterclub.com',
    company: isRevealed ? lead.company : 'Confidential Client',
    source: lead.source || 'Lead Signal',
    category: resolvedNiche,
    niche: resolvedNiche,
    title: lead.title,
    signalContext: isRevealed ? lead.signalContext : sanitizePublicText(lead.signalContext || ''),
    role: sanitizePublicText(lead.role || ''),
    taskScope: sanitizePublicText(lead.taskScope || ''),
    summary: sanitizePublicText(lead.taskScope || ''),
    detailsSummary: sanitizePublicText(lead.mustHave || lead.taskScope || ''),
    mustHave: sanitizePublicText(lead.mustHave || ''),
    nicheBonus: sanitizePublicText(lead.nicheBonus || ''),
    buyerType: sanitizePublicText(lead.buyerType || ''),
    urgency: (lead.urgency as AppLead['urgency']) || 'medium',
    winProb: (lead.winProb as AppLead['winProb']) || 'medium',
    nicheTags: lead.nicheTags || [],
    niches: lead.niches || [resolvedNiche],
    hashtags: lead.hashtags || [],
    replyProbability: lead.replyProbability || 60,
    accent: (lead.accent as AppLead['accent']) || 'mint',
    status: (userState?.status || 'saved') as AppLead['status'],
    timestamp: formatTimeAgo(lead.createdAt.toISOString()),
    scrapedAt: lead.createdAt.toISOString(),
    scrapedAgo: formatTimeAgo(lead.createdAt.toISOString()),
    isSaved: userState?.isSaved ?? true,
    isRevealed,
    isClaimable: true,
    hasPhone: !!phone,
    revealCost: 1,
    phone: isRevealed ? phone : null,
  }
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

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid
    const { searchParams } = new URL(request.url)
    const saved = searchParams.get('saved')
    const search = searchParams.get('search')
    const niche = searchParams.get('niche')
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
        include: { lead: { select: LEAD_POST_SELECT } },
      })

      // Ensure claimed/saved leads remain permanently accessible even if purged from oracle.lead_posts
      const missingLeadIds = userStates.filter((s) => !s.lead).map((s) => s.leadId)
      const fallbackLeads =
        missingLeadIds.length > 0
          ? await db.lead.findMany({ where: { id: { in: missingLeadIds } } })
          : []
      const fallbackMap = new Map(fallbackLeads.map((l) => [l.id, l]))

      data = userStates
        .map((s) => {
          if (s.lead) {
            return externalPostToAppLead(mapLeadPostToExternal(s.lead as any), s, false)
          }
          const fallback = fallbackMap.get(s.leadId)
          if (fallback) {
            return dbLeadToAppLead(fallback, s)
          }
          return null
        })
        .filter((l): l is AppLead => l !== null)
    } else {
      let externalLeads: ExternalPost[] = []
      try {
        const cacheKey = `${niche || 'All'}:${page}:${pageSize}`
        const cached = getCachedFeed(cacheKey)

        let rawLeads: any[]
        let total: number

        if (cached) {
          rawLeads = cached.rawLeads
          total = cached.total
        } else {
          // Active discovery feed strictly prioritizes freshly approved and unclaimed opportunities
          const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          const where: any = {
            is_deleted: false,
            review_status: 'approved',
            intelligence: { not: null as string | null },
            source: { not: 'seed' },
            OR: [
              { reviewed_at: { gte: cutoffDate } },
              { created_at: { gte: cutoffDate } },
              { updated_at: { gte: cutoffDate } },
            ],
          }
          if (niche && niche !== 'All') {
            where.niche = niche
          }
          const [fetchedLeads, fetchedTotal] = await Promise.all([
            oracleDb.leadPost.findMany({
              where,
              select: LEAD_POST_SELECT,
              orderBy: [
                { claimed_count: 'asc' },
                { reviewed_at: 'desc' },
                { updated_at: 'desc' },
                { created_at: 'desc' },
              ],
              skip: (page - 1) * pageSize,
              take: pageSize,
            }),
            oracleDb.leadPost.count({ where }),
          ])
          rawLeads = fetchedLeads
          total = fetchedTotal
          setCachedFeed(cacheKey, { rawLeads, total })
        }

        externalLeads = rawLeads.map(mapLeadPostToExternal)
        const leadIds = externalLeads.map((l) => l.id)

        let otherRevealCounts: Map<string, number>
        const revealCacheKey = [...leadIds].sort().join(',')
        const cachedReveals = getCachedRevealCounts(revealCacheKey)

        let userStates: any[] = []
        if (cachedReveals) {
          otherRevealCounts = cachedReveals
          userStates = leadIds.length > 0
            ? await db.userLeadState.findMany({
                where: { userId, leadId: { in: leadIds } },
              })
            : []
        } else {
          const [fetchedUserStates, otherRevealedStates] = await Promise.all([
            leadIds.length > 0
              ? db.userLeadState.findMany({
                  where: { userId, leadId: { in: leadIds } },
                })
              : [],
            leadIds.length > 0
              ? db.userLeadState.findMany({
                  where: { leadId: { in: leadIds }, isRevealed: true },
                  select: { leadId: true, userId: true },
                })
              : [],
          ])
          userStates = fetchedUserStates
          otherRevealCounts = new Map<string, number>()
          for (const s of otherRevealedStates) {
            otherRevealCounts.set(s.leadId, (otherRevealCounts.get(s.leadId) || 0) + 1)
          }
          setCachedRevealCounts(revealCacheKey, otherRevealCounts)
        }
        const stateMap = new Map(userStates.map((s) => [s.leadId, s]))

        const data = externalLeads
          .map((lead) => {
            const rawOtherCount = otherRevealCounts.get(lead.id) || 0
            const userUnlocked = stateMap.get(lead.id)?.isRevealed ? 1 : 0
            const otherCount = Math.max(0, rawOtherCount - userUnlocked)
            const totalClaims = Math.max(lead.claimed_count || 0, rawOtherCount)
            const isLimitReached = totalClaims >= 25 || lead.is_claimed
            return externalPostToAppLead(
              { ...lead, claimed_count: totalClaims },
              stateMap.get(lead.id),
              isLimitReached,
            )
          })
          .filter((l) => l.status === 'new')
          .sort((a, b) => {
            // 1. Unclaimed leads always come before claimed leads
            const aClaimed = a.isClaimedByOther ? 1 : 0
            const bClaimed = b.isClaimedByOther ? 1 : 0
            if (aClaimed !== bClaimed) {
              return aClaimed - bClaimed // 0 (unclaimed) before 1 (claimed)
            }
            // 2. Most recently approved/added leads first
            const aTime = new Date(a.approvedAt || a.reviewedAt || a.scrapedAt || 0).getTime()
            const bTime = new Date(b.approvedAt || b.reviewedAt || b.scrapedAt || 0).getTime()
            return bTime - aTime
          })

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
        console.error('[Leads API] Oracle DB connection failure:', msg)
        return NextResponse.json(
          {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Lead database is temporarily unreachable. Please retry shortly.',
            retryable: true,
          },
          {
            status: 503,
            headers: { 'Retry-After': '5' },
          },
        )
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
    const paginatedData = data.slice((page - 1) * pageSize, page * pageSize)

    return NextResponse.json({
      data: paginatedData,
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
