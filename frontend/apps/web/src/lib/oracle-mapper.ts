/**
 * Maps a raw LeadPost from oracle Prisma client to the ExternalPost shape
 * used throughout the frontend. This allows dropping-in direct DB queries
 * without changing any downstream mapping logic.
 */
import type { ExternalPost, ExternalAuthor, ExternalContactInfo } from '@/lib/external-api/client'
import type { LeadPost } from '@prisma/client'

export interface RawLeadPost {
  id: string
  post_id: string
  url: string
  content: string
  platform: string
  author: unknown
  posted_at: unknown
  engagement: unknown
  keyword: string | null
  keyword_id?: string | null
  status: string
  source: string
  image_url?: string | null
  ai_score: number
  is_training_data?: boolean
  is_deleted: boolean
  email?: string | null
  contact_info?: unknown
  source_type?: string
  source_profile?: string | null
  qualification_reason?: string | null
  enrichment_status?: string | null
  enrichment_message?: string | null
  enriched_at?: Date | null
  intelligence?: string | null
  title?: string | null
  niche?: string | null
  review_status?: string | null
  reviewed_at?: Date | null
  reviewed_by_id?: string | null
  claimed_count: number
  created_at: Date
  updated_at: Date
}

export function mapLeadPostToExternal(p: RawLeadPost | LeadPost): ExternalPost {
  const author = (p.author as ExternalAuthor) || {}
  const postedAt = (p.posted_at as {
    date?: string
    timestamp?: number
    postedAgoText?: string
    postedAgoShort?: string
  }) || {}
  const engagement = (p.engagement as {
    likes?: number
    comments?: number
    shares?: number
  }) || {}

  return {
    id: p.id,
    post_id: p.post_id,
    url: p.url,
    content: p.content,
    platform: p.platform,
    author: {
      name: author.name || '',
      handle: author.handle,
      url: author.url,
      info: author.info,
      avatar: author.avatar,
    },
    posted_at: {
      date: postedAt.date || p.created_at.toISOString(),
      timestamp: postedAt.timestamp || p.created_at.getTime(),
      postedAgoText: postedAt.postedAgoText || '',
      postedAgoShort: postedAt.postedAgoShort || '',
    },
    engagement: {
      likes: engagement.likes || 0,
      comments: engagement.comments || 0,
      shares: engagement.shares || 0,
    },
    keyword: p.keyword,
    keyword_id: p.keyword_id || null,
    status: p.status,
    source: p.source,
    image_url: p.image_url || null,
    ai_score: p.ai_score,
    is_training_data: p.is_training_data || false,
    is_deleted: p.is_deleted,
    email: p.email || null,
    contact_info: (p.contact_info as ExternalContactInfo) || null,
    source_type: p.source_type || 'keyword',
    source_profile: p.source_profile || '',
    qualification_reason: p.qualification_reason || null,
    enrichment_status: p.enrichment_status || 'pending',
    enrichment_message: p.enrichment_message || null,
    enriched_at: p.enriched_at?.toISOString() || null,
    intelligence: p.intelligence || null,
    title: p.title || null,
    niche: (p as any).niche || null,
    review_status: p.review_status || null,
    reviewed_at: p.reviewed_at?.toISOString() || null,
    reviewed_by_id: p.reviewed_by_id || null,
    reviewed_by_name: null,
    is_claimed: p.claimed_count > 0,
    claimed_count: p.claimed_count,
    created_at: p.created_at.toISOString(),
    updated_at: p.updated_at.toISOString(),
  }
}
