import { config } from '@/lib/config'
import { ApiError, AuthError, NetworkError, ValidationError } from './errors'
import type { ApiResponse, RequestMethod } from '@/lib/types'
import { getFirebaseToken } from '@/lib/firebase'

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const base = config.api.baseUrl
  const url = new URL(
    path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`,
  )

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url.toString()
}

interface RequestOptions {
  method: RequestMethod
  body?: unknown
  params?: Record<string, string | number | undefined>
  timeout?: number
}

export async function request<T>(path: string, options: RequestOptions): Promise<T> {
  const { method, body, params, timeout = config.api.timeout } = options

  const url = buildUrl(path, params)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const token = await getFirebaseToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 401) {
      throw new AuthError()
    }

    if (!response.ok) {
      await handleErrorResponse(response)
    }

    return parseResponse<T>(response)
  } catch (err) {
    clearTimeout(timeoutId)

    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new NetworkError(`Request timed out after ${timeout}ms`)
    }
    throw new NetworkError('Network request failed', err)
  }
}

async function handleErrorResponse(response: Response): Promise<never> {
  let body: { code?: string; message?: string; details?: Record<string, string[]> } | null = null
  try {
    body = await response.json()
  } catch {
    // response body is not JSON
  }

  const code = body?.code || 'UNKNOWN_ERROR'
  const message = body?.message || response.statusText || 'An error occurred'

  switch (response.status) {
    case 400:
      throw new ApiError(message, 400, code, body?.details)
    case 401:
      throw new AuthError(message)
    case 403:
      throw new ApiError(message, 403, 'FORBIDDEN')
    case 404:
      throw new ApiError(message, 404, 'NOT_FOUND')
    case 409:
      throw new ApiError(message, 409, 'CONFLICT')
    case 422:
      throw new ValidationError(body?.details || {})
    case 429:
      throw new ApiError(message, 429, 'RATE_LIMITED')
    default:
      throw new ApiError(message, response.status, code)
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T

  const json = await response.json()

  if (json && typeof json === 'object') {
    if ('data' in json && 'pagination' in json) {
      return json as T
    }
    if ('data' in json) {
      return (json as ApiResponse<T>).data
    }
  }

  return json as T
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    request<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),

  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
