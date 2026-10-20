import type { ExternalPost } from '@/lib/external-api/client'
import type { Lead } from '@prisma/client'
import type { AppLead } from '@/types/lead'
import { getLeadRevealCost } from '@/lib/config/coins'
import {
  extractNiches,
  sanitizePublicText,
  extractLeadBadges,
  extractLeadSummaries,
  sanitizeHeadline,
} from '@/lib/claim-reveal'

export function formatTimeAgo(dateStr: string): string {
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

export function isLeadClaimable(post: ExternalPost): boolean {
  return post.source === 'seed' || (post.review_status === 'approved' && !!post.intelligence)
}

export function extractSection(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`#+\\s*\\?*\\s*${escaped}\\s*\\n+([\\s\\S]*?)(?:\\n#+\\s|$)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

export const LEAD_POST_SELECT = {
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

export function externalPostToAppLead(
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
  const cleanTags = extractLeadBadges({ ...post, claimed_count: effectiveClaimedCount }, niches)
  const resolvedNiche = niches[0] && niches[0] !== 'General' ? niches[0] : primaryNiche || 'General'
  const cleanTitle = post.title?.trim() || sanitizeHeadline(post.author?.info || post.keyword || '', resolvedNiche)
  const { summary, detailsSummary } = extractLeadSummaries(post)

  const approvedOrLiveDate = post.reviewed_at || (post as any).approved_at || post.updated_at || post.created_at
  const isExpired24h = approvedOrLiveDate
    ? Date.now() - new Date(approvedOrLiveDate).getTime() >= 24 * 60 * 60 * 1000
    : false
  const isAutoClaimedAfter24h = isExpired24h && !isRevealed
  const effectiveClaimedCount = isAutoClaimedAfter24h ? 25 : post.claimed_count || 0
  const effectiveClaimedByOther =
    isClaimedByOther ||
    isAutoClaimedAfter24h ||
    (!isRevealed && (effectiveClaimedCount >= 25 || post.is_claimed))

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
    claimedCount: effectiveClaimedCount,
    isSaved: userState?.isSaved || false,
    isRevealed,
    isClaimable: effectiveClaimedByOther ? false : isLeadClaimable(post),
    isClaimedByOther: effectiveClaimedByOther,
    hasPhone: !effectiveClaimedByOther && !!phone,
    creditCost: (post as any).credit_cost ?? null,
    revealCost: effectiveClaimedByOther ? null : getLeadRevealCost(post),
    phone: isRevealed ? phone : null,
    engagement: { likes: 0, comments: 0 },
  }
}

export function dbLeadToAppLead(
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
    company: isRevealed ? lead.company || 'Direct Client' : 'Confidential Client',
    source: 'Lead Signal',
    category: resolvedNiche,
    niche: resolvedNiche,
    title: lead.title,
    signalContext: lead.signalContext,
    role: lead.role,
    taskScope: lead.taskScope,
    summary: lead.taskScope,
    detailsSummary: lead.signalContext,
    mustHave: lead.mustHave,
    nicheBonus: lead.nicheBonus,
    buyerType: lead.buyerType,
    urgency: (lead.urgency as AppLead['urgency']) || 'medium',
    winProb: (lead.winProb as AppLead['winProb']) || 'medium',
    nicheTags: [resolvedNiche],
    niches: [resolvedNiche],
    hashtags: [],
    replyProbability: lead.replyProbability,
    accent: 'mint',
    status: (userState?.status || 'new') as AppLead['status'],
    timestamp: formatTimeAgo(lead.createdAt.toISOString()),
    scrapedAt: lead.createdAt.toISOString(),
    scrapedAgo: formatTimeAgo(lead.createdAt.toISOString()),
    reviewedAt: lead.createdAt.toISOString(),
    approvedAt: lead.createdAt.toISOString(),
    claimedCount: lead.claimedCount,
    isSaved: userState?.isSaved || false,
    isRevealed,
    isClaimable: true,
    isClaimedByOther: false,
    hasPhone: !!phone,
    creditCost: lead.revealCost || 1,
    revealCost: lead.revealCost || 1,
    phone: isRevealed ? phone : null,
    engagement: { likes: 0, comments: 0 },
  }
}
