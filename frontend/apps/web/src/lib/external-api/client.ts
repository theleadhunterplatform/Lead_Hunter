let cachedToken: string | null = null
let tokenExpiry = 0

function requireCredentials() {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  const EMAIL = process.env.EXTERNAL_API_EMAIL
  const PASSWORD = process.env.EXTERNAL_API_PASSWORD
  if (!BASE_URL || !EMAIL || !PASSWORD) {
    throw new Error(
      'External API credentials not configured. Set NEXT_PUBLIC_API_URL, EXTERNAL_API_EMAIL, and EXTERNAL_API_PASSWORD.',
    )
  }
  return { BASE_URL, EMAIL, PASSWORD }
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const { BASE_URL, EMAIL, PASSWORD } = requireCredentials()

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })

    if (res.ok) {
      const json = await res.json()
      cachedToken = json.data.access_token
      tokenExpiry = Date.now() + 10 * 60 * 1000
      return cachedToken!
    }

    if (res.status === 429 || res.status === 503 || res.status >= 500) {
      if (attempt < 2) {
        const backoff = Math.min(1000 * 2 ** attempt, 4000)
        await sleep(backoff)
        continue
      }
    }

    throw new Error(`External API auth failed: ${res.status}`)
  }

  throw new Error('External API auth failed after retries')
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class ExternalApiError extends Error {
  status: number
  externalMessage: string

  constructor(status: number, message: string, externalMessage?: string) {
    super(message)
    this.name = 'ExternalApiError'
    this.status = status
    this.externalMessage = externalMessage || message
  }
}

function parseExternalError(status: number, text: string): string {
  try {
    const json = JSON.parse(text)
    return typeof json?.error === 'string' ? json.error : typeof json?.message === 'string' ? json.message : text
  } catch {
    return text
  }
}

export async function fetchApi<T>(path: string, options: RequestInit = {}, retries = 3): Promise<T> {
  const { BASE_URL } = requireCredentials()
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  for (let attempt = 0; attempt < retries; attempt++) {
    const token = await getToken()
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (res.status === 429 || res.status === 503 || res.status >= 500) {
      if (attempt < retries - 1) {
        const backoff = Math.min(1000 * 2 ** attempt, 4000)
        await sleep(backoff)
        continue
      }
      const errorText = await res.text()
      console.error(`[External API] Server error ${res.status} ${path}:`, errorText)
      const externalMessage = parseExternalError(res.status, errorText)
      throw new ExternalApiError(
        res.status,
        `External API error: ${externalMessage}`,
        externalMessage,
      )
    }

    if (res.status === 401) {
      cachedToken = null
      tokenExpiry = 0
      const newToken = await getToken()
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        },
      })
      if (!retryRes.ok) {
        const errorText = await retryRes.text()
        console.error(`[External API] 401 retry failed ${path}:`, errorText)
        const externalMessage = parseExternalError(retryRes.status, errorText)
        throw new ExternalApiError(
          retryRes.status,
          `External API error: ${externalMessage}`,
          externalMessage,
        )
      }
      return retryRes.json()
    }

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[External API] ${res.status} ${path}:`, errorText)
      const externalMessage = parseExternalError(res.status, errorText)
      throw new ExternalApiError(
        res.status,
        `External API error: ${externalMessage}`,
        externalMessage,
      )
    }

    return res.json()
  }

  throw new ExternalApiError(500, 'External API request failed after retries')
}

export interface ExternalAuthor {
  name: string
  handle?: string
  url?: string
  info?: string
  avatar?: { url: string }
}

export interface ExternalEngagement {
  likes: number
  comments: number
  shares: number
}

export interface ExternalEmailEntry {
  email: string
  found_by?: string[]
  email_status?: string
  email_source?: string
  find_note?: string
  verification_note?: string
  verified_by?: string[]
  is_primary?: boolean
}

export interface ExternalContactInfo {
  name: string
  emails: ExternalEmailEntry[]
  phone_numbers: { number: string; type?: string; source?: string }[]
  company_name?: string
  title?: string
  headline?: string
  linkedin_public_id?: string
  email_conflict?: boolean
  email_status?: string
  email_source?: string
  found_by?: string[]
  verified_by?: string[]
  find_note?: string
  verification_note?: string
  email_verified_at?: string
}

export interface ExternalPost {
  id: string
  post_id: string
  url: string
  content: string
  platform: string
  author: ExternalAuthor
  posted_at: {
    date: string
    timestamp: number
    postedAgoText: string
    postedAgoShort: string
  }
  engagement: ExternalEngagement
  keyword: string | null
  keyword_id: string | null
  status: string
  source: string
  image_url: string | null
  ai_score: number
  is_training_data: boolean
  is_deleted: boolean
  email: string | null
  contact_info: ExternalContactInfo | null
  source_type: string
  source_profile: string
  qualification_reason: string | null
  enrichment_status: string
  enrichment_message: string | null
  enriched_at: string | null
  intelligence: string | null
  title: string | null
  review_status: string | null
  reviewed_at: string | null
  reviewed_by_id: string | null
  reviewed_by_name: string | null
  is_claimed: boolean
  claimed_count: number
  created_at: string
  updated_at: string
}

interface PostsResponse {
  success: boolean
  count: number
  total: number
  page: number
  pages: number
  counts: Record<string, number>
  data: ExternalPost[]
}

interface PostResponse {
  success: boolean
  data: ExternalPost
}

interface ClaimResponse {
  success: boolean
  message: string
  data?: ExternalPost
}

export async function getPosts(params?: {
  page?: number
  perPage?: number
  status?: string
  search?: string
  keyword?: string
  platform?: string
}): Promise<PostsResponse> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.perPage) search.set('limit', String(params.perPage))
  if (params?.status) search.set('status', params.status)
  if (params?.search) search.set('search', params.search)
  if (params?.keyword) search.set('keyword', params.keyword)
  if (params?.platform) search.set('platform', params.platform)

  const qs = search.toString()
  return fetchApi<PostsResponse>(`/posts${qs ? `?${qs}` : ''}`)
}

export async function getPost(id: string): Promise<ExternalPost> {
  const res = await fetchApi<PostResponse>(`/posts/${id}`)
  if (!res.data) throw new Error(`External API: post ${id} not found`)
  return res.data
}

export async function claimPost(id: string): Promise<ExternalPost> {
  const res = await fetchApi<ClaimResponse>(`/posts/${id}/claim`, {
    method: 'POST',
  })
  if (!res.data) throw new Error(`External API: claim returned no data for post ${id}`)
  return res.data
}

// --- Admin lead management ---

interface AdminActionResponse {
  success: boolean
  message: string
  data?: ExternalPost
}

interface BulkActionResponse {
  success: boolean
  message: string
  approved?: number
  rejected?: number
  deleted?: number
  queued?: number
  skipped?: number
}

interface LeadStatsResponse {
  success: boolean
  data: Record<string, number>
}

interface AiMetricsResponse {
  success: boolean
  data: {
    status: string
    model_ready?: boolean
    samples?: number
    accuracy?: number
    relevant_count?: number
    irrelevant_count?: number
    message?: string
  }
}

interface IntelSettingsResponse {
  success: boolean
  data: {
    is_configured: boolean
    model: string
  }
}

interface AutomationSettingsResponse {
  success: boolean
  data: {
    auto_scrape_enabled: boolean
    auto_enrichment_enabled: boolean
    keep_alive_enabled: boolean
    keep_alive_configured: boolean
    scrape_interval_minutes: number
    keep_alive_interval_minutes: number
  }
}

export async function getAutomationSettings(): Promise<AutomationSettingsResponse['data']> {
  const res = await fetchApi<AutomationSettingsResponse>(`/settings/automation`)
  return res.data
}

export async function updateAutomationSettings(settings: {
  auto_scrape_enabled?: boolean
  auto_enrichment_enabled?: boolean
  keep_alive_enabled?: boolean
}): Promise<AutomationSettingsResponse['data']> {
  const res = await fetchApi<AutomationSettingsResponse>(`/settings/automation`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })
  return res.data
}

export async function approvePost(id: string): Promise<ExternalPost> {
  const res = await fetchApi<AdminActionResponse>(`/posts/${id}/approve`, { method: 'POST' })
  if (!res.data) throw new Error(`External API: approve returned no data for post ${id}`)
  return res.data
}

export async function rejectPost(id: string): Promise<void> {
  await fetchApi<AdminActionResponse>(`/posts/${id}/reject-review`, { method: 'POST' })
}

export async function regenerateIntel(id: string): Promise<{ post: ExternalPost; mode: string }> {
  const res = await fetchApi<AdminActionResponse & { mode?: string }>(`/posts/${id}/generate-intelligence`, { method: 'POST' })
  return { post: res.data!, mode: res.mode || 'inline' }
}

export async function generateTitle(id: string): Promise<ExternalPost> {
  const res = await fetchApi<AdminActionResponse>(`/posts/${id}/generate-title`, { method: 'POST' })
  if (!res.data) throw new Error(`External API: generate-title returned no data for post ${id}`)
  return res.data
}

export async function bulkApprove(params?: {
  status?: string
  search?: string
  keyword?: string
  platform?: string
}): Promise<BulkActionResponse> {
  return fetchApi<BulkActionResponse>(`/posts/bulk-approve`, {
    method: 'POST',
    body: JSON.stringify(params || {}),
  })
}

export async function bulkApproveByIds(ids: string[]): Promise<BulkActionResponse> {
  return fetchApi<BulkActionResponse>(`/posts/bulk-approve-selected`, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function bulkReject(params?: {
  status?: string
  search?: string
  keyword?: string
  platform?: string
}): Promise<BulkActionResponse> {
  return fetchApi<BulkActionResponse>(`/posts/bulk-reject`, {
    method: 'POST',
    body: JSON.stringify(params || {}),
  })
}

export async function bulkDeletePosts(ids: string[]): Promise<BulkActionResponse> {
  return fetchApi<BulkActionResponse>(`/posts/bulk-delete`, {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function bulkReanalyse(params?: {
  status?: string
  search?: string
  keyword?: string
  platform?: string
}): Promise<BulkActionResponse> {
  return fetchApi<BulkActionResponse>(`/posts/bulk-reanalyse`, {
    method: 'POST',
    body: JSON.stringify(params || {}),
  })
}

export async function bulkReEnrich(params?: {
  status?: string
  search?: string
  keyword?: string
  platform?: string
}): Promise<BulkActionResponse> {
  return fetchApi<BulkActionResponse>(`/posts/bulk-re-enrich`, {
    method: 'POST',
    body: JSON.stringify(params || {}),
  })
}

export async function reEnrichPost(id: string): Promise<void> {
  await fetchApi<AdminActionResponse>(`/posts/${id}/re-enrich`, { method: 'POST' })
}

export async function deletePost(id: string): Promise<void> {
  await fetchApi<AdminActionResponse>(`/posts/${id}`, { method: 'DELETE' })
}

export async function updatePostLabel(
  id: string,
  data: { status?: string; is_training_data?: boolean },
): Promise<ExternalPost> {
  const res = await fetchApi<AdminActionResponse>(`/posts/${id}/label`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.data) throw new Error(`External API: label returned no data for post ${id}`)
  return res.data
}

export async function updatePost(id: string, data: Record<string, unknown>): Promise<ExternalPost> {
  const res = await fetchApi<AdminActionResponse>(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.data) throw new Error(`External API: update returned no data for post ${id}`)
  return res.data
}

export async function reExtractPost(id: string): Promise<{ message?: string }> {
  return fetchApi<{ success: boolean; message?: string }>(`/posts/${id}/re-extract`, {
    method: 'POST',
  })
}

export async function setManualContact(
  id: string,
  data: { email?: string; phone?: string; note?: string },
): Promise<{ success: boolean; data?: ExternalPost; message?: string }> {
  return fetchApi<{ success: boolean; data?: ExternalPost; message?: string }>(
    `/posts/${id}/manual-contact`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  )
}

export async function trainAiNow(): Promise<AiMetricsResponse['data']> {
  const res = await fetchApi<AiMetricsResponse>(`/ai/train-now`, { method: 'POST' })
  return res.data
}

export async function uploadManualPosts(
  formData: FormData,
): Promise<{ success: boolean; count: number; results: unknown[] }> {
  return fetchApi<{ success: boolean; count: number; results: unknown[] }>(`/posts/upload`, {
    method: 'POST',
    body: formData,
  })
}

export async function getLeadIntelligenceStats(): Promise<Record<string, number>> {
  const res = await fetchApi<LeadStatsResponse>(`/posts/stats`)
  return res.data
}

export async function getAiMetrics(): Promise<AiMetricsResponse['data']> {
  const res = await fetchApi<AiMetricsResponse>(`/ai/metrics`)
  return res.data
}

export async function getIntelligenceSettings(): Promise<IntelSettingsResponse['data']> {
  const res = await fetchApi<IntelSettingsResponse>(`/settings/intelligence`)
  return res.data
}

interface OpenRouterSettingResponse {
  success: boolean
  data: {
    api_key: string | null
    is_configured: boolean
    model?: string
  }
}

export async function getOpenRouterApiKey(): Promise<OpenRouterSettingResponse['data']> {
  const res = await fetchApi<OpenRouterSettingResponse>(`/settings/openrouter-api-key`)
  return res.data
}

export async function updateOpenRouterApiKey(api_key: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchApi<{ success: boolean; message: string }>(`/settings/openrouter-api-key`, {
    method: 'POST',
    body: JSON.stringify({ api_key }),
  })
  return res
}

interface TokenSettingResponse {
  success: boolean
  data: {
    token: string | null
    is_configured: boolean
    usage?: Record<string, number>
  }
}

interface ApiKeySettingResponse {
  success: boolean
  data: {
    api_key: string | null
    is_configured: boolean
    usage?: Record<string, number>
  }
}

export async function getContactCompassToken(): Promise<TokenSettingResponse['data']> {
  const res = await fetchApi<TokenSettingResponse>(`/settings/contact-compass-token`)
  return res.data
}

export async function updateContactCompassToken(token: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchApi<{ success: boolean; message: string }>(`/settings/contact-compass-token`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
  return res
}

export async function getHunterApiKey(): Promise<ApiKeySettingResponse['data']> {
  const res = await fetchApi<ApiKeySettingResponse>(`/settings/hunter-api-key`)
  return res.data
}

export async function updateHunterApiKey(api_key: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchApi<{ success: boolean; message: string }>(`/settings/hunter-api-key`, {
    method: 'POST',
    body: JSON.stringify({ api_key }),
  })
  return res
}

export async function getContactOutToken(): Promise<TokenSettingResponse['data']> {
  const res = await fetchApi<TokenSettingResponse>(`/settings/contactout-api-token`)
  return res.data
}

export async function updateContactOutToken(token: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchApi<{ success: boolean; message: string }>(`/settings/contactout-api-token`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
  return res
}

export async function getApolloApiKey(): Promise<ApiKeySettingResponse['data']> {
  const res = await fetchApi<ApiKeySettingResponse>(`/settings/apollo-api-key`)
  return res.data
}

export async function updateApolloApiKey(api_key: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchApi<{ success: boolean; message: string }>(`/settings/apollo-api-key`, {
    method: 'POST',
    body: JSON.stringify({ api_key }),
  })
  return res
}

// --- Watchlist targets (backend proxy) ---

export interface ExternalTarget {
  id: string
  name: string
  url: string
  platform: string
  notes: string | null
  is_active: boolean
  last_scraped_at: string | null
  last_comments_found: number
  monthly_comments_found: number
  usage_month: string | null
  created_at: string
  updated_at: string
}

interface TargetsResponse {
  success: boolean
  count: number
  data: ExternalTarget[]
}

interface TargetResponse {
  success: boolean
  data: ExternalTarget
}

export async function getTargets(): Promise<TargetsResponse> {
  return fetchApi<TargetsResponse>(`/targets`)
}

export async function getTarget(id: string): Promise<TargetResponse> {
  return fetchApi<TargetResponse>(`/targets/${id}`)
}

export async function createTarget(input: {
  name: string
  url: string
  platform: string
  notes?: string | null
}): Promise<TargetResponse> {
  return fetchApi<TargetResponse>(`/targets`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateTarget(
  id: string,
  input: Partial<{ name: string; url: string; platform: string; notes: string | null; is_active: boolean }>,
): Promise<TargetResponse> {
  return fetchApi<TargetResponse>(`/targets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteTarget(id: string): Promise<{ success: boolean; data: unknown }> {
  return fetchApi<{ success: boolean; data: unknown }>(`/targets/${id}`, {
    method: 'DELETE',
  })
}

// --- Keywords (backend proxy) ---

export interface ExternalKeyword {
  id: string
  text: string
  platforms: string[]
  is_active: boolean
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

interface KeywordsResponse {
  success: boolean
  count: number
  data: ExternalKeyword[]
}

interface KeywordResponse {
  success: boolean
  data: ExternalKeyword
}

export async function getKeywords(): Promise<KeywordsResponse> {
  return fetchApi<KeywordsResponse>(`/keywords`)
}

export async function createKeyword(input: { text: string; platforms: string[] }): Promise<KeywordResponse> {
  return fetchApi<KeywordResponse>(`/keywords`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateKeyword(
  id: string,
  input: Partial<{ text: string; platforms: string[]; is_active: boolean }>,
): Promise<KeywordResponse> {
  return fetchApi<KeywordResponse>(`/keywords/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteKeyword(id: string): Promise<{ success: boolean; data: unknown }> {
  return fetchApi<{ success: boolean; data: unknown }>(`/keywords/${id}`, {
    method: 'DELETE',
  })
}

// --- Apify keys (backend proxy) ---

export interface ExternalApifyKey {
  id: string
  key: string
  label: string | null
  is_active: boolean
  comments_used: number
  comments_limit: number
  comments_remaining: number
  usage_month: string
  assigned_worker: string | null
  usage: {
    status: string
    exhausted: boolean
    used: number
    limit: number
    remaining: number
  } | null
  created_at: string
}

interface ApifyKeysResponse {
  success: boolean
  count: number
  worker_id: string | null
  active_leases: unknown[]
  data: ExternalApifyKey[]
}

interface ApifyKeyResponse {
  success: boolean
  data: ExternalApifyKey
}

export async function getApifyKeys(): Promise<ApifyKeysResponse> {
  return fetchApi<ApifyKeysResponse>(`/apify-keys`)
}

export async function createApifyKey(input: { key: string; label?: string | null }): Promise<ApifyKeyResponse> {
  return fetchApi<ApifyKeyResponse>(`/apify-keys`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function deleteApifyKey(id: string): Promise<{ success: boolean; data: unknown }> {
  return fetchApi<{ success: boolean; data: unknown }>(`/apify-keys/${id}`, {
    method: 'DELETE',
  })
}

// --- Scrape-all (backend 202) ---

export async function scrapeAllTargets(): Promise<{ success: boolean; message: string; count?: number }> {
  return fetchApi<{ success: boolean; message: string; count?: number }>(`/targets/scrape-all`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}
