function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_API_URL) return process.env.NEXT_PUBLIC_APP_API_URL
  if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  if (typeof window !== 'undefined') return `${window.location.origin}/api`
  return 'http://localhost:3000/api'
}

export const config = {
  api: {
    baseUrl: getApiUrl(),
    serverUrl: process.env.API_URL || getApiUrl(),
    timeout: 15000,
    retries: 2,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://leadhunterclub.com',
    name: 'Lead Hunter Club',
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
} as const

export type Config = typeof config
