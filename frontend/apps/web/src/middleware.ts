import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/lib/verify-session'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadhunterclub.com'
const ALLOWED_ORIGINS = [APP_URL, 'http://localhost:3000']

const publicPrefixes = ['/api']

const adminPrefixes = ['/admin']

const protectedPrefixes = ['/dashboard', '/leads', '/outreach', '/saved', '/analytics', '/settings']

function addSecurityHeaders(response: NextResponse): NextResponse {
  const origin = response.headers.get('origin') || ''
  if (ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (request.method === 'OPTIONS') {
    return addSecurityHeaders(new NextResponse(null, { status: 204 }))
  }

  const isPublic =
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/register' ||
    pathname.startsWith('/register/') ||
    pathname.startsWith('/sneak-peek') ||
    pathname === '/onboarding' ||
    pathname === '/verify-email' ||
    pathname === '/pending-approval' ||
    pathname === '/admin-register'
  const isPublicPrefix = publicPrefixes.some((prefix) => pathname.startsWith(prefix))
  const isStaticFile = pathname.startsWith('/_next') || pathname.startsWith('/static')
  const isFavicon = pathname === '/favicon.ico'
  const isProtected =
    protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    adminPrefixes.some((prefix) => pathname.startsWith(prefix))

  if (isPublic || isPublicPrefix || isStaticFile || isFavicon) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  if (isProtected) {
    const sessionCookie = request.cookies.get('__session')

    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const response = NextResponse.redirect(loginUrl)
      addSecurityHeaders(response)
      return response
    }

    const session = await verifySession(sessionCookie.value)
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.set('__session', '', { maxAge: 0, path: '/' })
      addSecurityHeaders(response)
      return response
    }

    // Email verification gate (JWT-level, no DB hit)
    if (session.email_verified === false) {
      const verifyUrl = new URL('/verify-email', request.url)
      verifyUrl.searchParams.set('redirect', pathname)
      const response = NextResponse.redirect(verifyUrl)
      addSecurityHeaders(response)
      return response
    }
  }

  const response = NextResponse.next()
  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
