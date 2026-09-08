import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function setEnv() {
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'
  process.env.EXTERNAL_API_EMAIL = 'test@example.com'
  process.env.EXTERNAL_API_PASSWORD = 'secret'
}

// Load the client fresh per test so the module-level token cache resets.
async function loadClient() {
  return await import('@/lib/external-api/client')
}

function mockLogin() {
  return {
    ok: true,
    json: async () => ({ data: { access_token: 'token-123' } }),
  }
}

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  setEnv()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('fetchApi auth', () => {
  it('logs in and calls the API with a bearer token', async () => {
    const { fetchApi } = await loadClient()
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ success: true, data: [] }) as never)

    const result = await fetchApi<{ data: unknown[] }>('/posts')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const loginCall = fetchMock.mock.calls[0]
    expect(loginCall[0]).toBe('https://api.example.com/auth/login')

    const apiCall = fetchMock.mock.calls[1]
    const headers = (apiCall[1] as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer token-123')
    expect(result).toEqual({ success: true, data: [] })
  })

  it('throws a helpful error when credentials are missing', async () => {
    const { fetchApi } = await loadClient()
    delete process.env.NEXT_PUBLIC_API_URL
    await expect(fetchApi('/posts')).rejects.toThrow(
      'External API credentials not configured',
    )
  })
})

describe('fetchApi retry on transient failures', () => {
  it('retries on 503 then succeeds', async () => {
    const { fetchApi } = await loadClient()
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ error: 'boom' }, 503) as never)
      .mockResolvedValueOnce(mockResponse({ success: true }) as never)

    const result = await fetchApi<{ success: boolean }>('/posts')
    expect(result).toEqual({ success: true })
    expect(fetchMock.mock.calls.length).toBe(3)
  })

  it('throws ExternalApiError when all retries fail', async () => {
    const { fetchApi, ExternalApiError } = await loadClient()
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ error: 'down' }, 500) as never)
      .mockResolvedValueOnce(mockResponse({ error: 'down' }, 500) as never)
      .mockResolvedValueOnce(mockResponse({ error: 'down' }, 500) as never)

    await expect(fetchApi('/posts')).rejects.toBeInstanceOf(ExternalApiError)
  })

  it('re-authenticates on 401 and retries', async () => {
    const { fetchApi } = await loadClient()
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ error: 'unauthorized' }, 401) as never)
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ success: true }) as never)

    const result = await fetchApi<{ success: boolean }>('/posts')
    expect(result).toEqual({ success: true })
  })

  it('wraps 4xx errors in ExternalApiError without retry', async () => {
    const { fetchApi, ExternalApiError } = await loadClient()
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ error: 'not found' }, 404) as never)

    await expect(fetchApi('/posts')).rejects.toBeInstanceOf(ExternalApiError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('getPosts query building', () => {
  it('maps perPage to limit param and status', async () => {
    const { getPosts } = await loadClient()
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ data: [] }) as never)

    await getPosts({ page: 2, perPage: 50, status: 'approved' })
    const apiCall = fetchMock.mock.calls[1]
    expect(String(apiCall[0])).toContain('limit=50')
    expect(String(apiCall[0])).toContain('page=2')
    expect(String(apiCall[0])).toContain('status=approved')
  })

  it('calls without query string when no params', async () => {
    const { getPosts } = await loadClient()
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ data: [] }) as never)

    await getPosts()
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://api.example.com/posts')
  })
})

describe('getPost / claimPost', () => {
  it('throws when post not found', async () => {
    const { getPost } = await loadClient()
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ success: true, data: null }) as never)

    await expect(getPost('missing')).rejects.toThrow('not found')
  })

  it('returns the post data on success', async () => {
    const { getPost } = await loadClient()
    const post = { id: 'lead-1', content: 'hi' }
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ success: true, data: post }) as never)

    const result = await getPost('lead-1')
    expect(result.id).toBe('lead-1')
  })

  it('calls the claim endpoint with POST', async () => {
    const { claimPost } = await loadClient()
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ success: true, data: { id: 'lead-1' } }) as never)

    await claimPost('lead-1')
    const apiCall = fetchMock.mock.calls[1]
    expect(String(apiCall[0])).toContain('/posts/lead-1/claim')
    expect((apiCall[1] as RequestInit).method).toBe('POST')
  })

  it('throws when claim returns no data', async () => {
    const { claimPost } = await loadClient()
    fetchMock
      .mockResolvedValueOnce(mockLogin() as never)
      .mockResolvedValueOnce(mockResponse({ success: true, data: null }) as never)

    await expect(claimPost('lead-1')).rejects.toThrow('claim returned no data')
  })
})