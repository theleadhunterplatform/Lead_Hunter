import { NextResponse } from 'next/server'
import { verifyIdToken } from './firebase-admin'
import { db } from './db'

export interface AuthUser {
  uid: string
  email?: string
  name?: string
  phone?: string
  emailVerified?: boolean
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  if (!token) return null

  const decoded = await verifyIdToken(token)
  if (!decoded) return null

  return {
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name || decoded.email?.split('@')[0],
    phone: decoded.phone_number,
    emailVerified: decoded.email_verified === true,
  }
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getAuthUser(request)
  if (!user) {
    throw new AuthRequiredError()
  }
  return user
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required')
    this.name = 'AuthRequiredError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class InactiveUserError extends Error {
  constructor(message = 'User account is not active') {
    super(message)
    this.name = 'InactiveUserError'
  }
}

export class EmailNotVerifiedError extends Error {
  constructor(message = 'Email is not verified') {
    super(message)
    this.name = 'EmailNotVerifiedError'
  }
}

export class OnboardingRequiredError extends Error {
  constructor(message = 'Onboarding must be completed before using the app') {
    super(message)
    this.name = 'OnboardingRequiredError'
  }
}

export class PendingApprovalError extends Error {
  constructor(message = 'Your application is under review') {
    super(message)
    this.name = 'PendingApprovalError'
  }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { code: 'UNAUTHORIZED', message: 'Authentication required' },
    { status: 401 },
  )
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ code: 'FORBIDDEN', message }, { status: 403 })
}

export function inactiveResponse(message = 'User account is not active') {
  return NextResponse.json({ code: 'INACTIVE', message }, { status: 403 })
}

export function emailNotVerifiedResponse(message = 'Email is not verified') {
  return NextResponse.json({ code: 'EMAIL_NOT_VERIFIED', message }, { status: 403 })
}

export async function requireEmailVerified(request: Request): Promise<AuthUser> {
  const user = await getAuthUser(request)
  if (!user) {
    throw new AuthRequiredError()
  }

  if (user.emailVerified !== true) {
    throw new EmailNotVerifiedError()
  }

  return user
}

export async function requireAdmin(request: Request): Promise<AuthUser> {
  const user = await getAuthUser(request)
  if (!user) {
    throw new AuthRequiredError()
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.uid },
    select: { role: true },
  })

  if (!dbUser || dbUser.role !== 'admin') {
    throw new ForbiddenError()
  }

  return user
}

export async function requireActiveUser(request: Request): Promise<AuthUser> {
  const user = await getAuthUser(request)
  if (!user) {
    throw new AuthRequiredError()
  }

  if (user.emailVerified !== true) {
    throw new EmailNotVerifiedError()
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.uid },
    select: { status: true },
  })

  if (!dbUser || dbUser.status !== 'ACTIVE') {
    throw new InactiveUserError()
  }

  return user
}

export interface OnboardingFields {
  portfolio?: string | null
  website?: string | null
  linkedin?: string | null
  instagram?: string | null
  servicesOffered?: string[]
  preferredLeadCategories?: string[]
  outreachExperience?: string | null
  discoverySource?: string | null
}

export function hasCompletedOnboarding(user: OnboardingFields): boolean {
  return !!(
    user.portfolio ||
    user.website ||
    user.linkedin ||
    user.instagram ||
    (user.servicesOffered?.length ?? 0) > 0 ||
    (user.preferredLeadCategories?.length ?? 0) > 0 ||
    user.outreachExperience ||
    user.discoverySource
  )
}

/**
 * Full app-authorization gate: email verified + DB status ACTIVE + onboarding completed.
 * Use on routes that expose lead/app data (feed, reveal, outreach, dashboard, sheets).
 */
export async function requireFullyAuthorized(request: Request): Promise<AuthUser> {
  const user = await requireActiveUser(request)

  const dbUser = await db.user.findUnique({
    where: { id: user.uid },
    select: {
      status: true,
      role: true,
      portfolio: true,
      website: true,
      linkedin: true,
      instagram: true,
      servicesOffered: true,
      preferredLeadCategories: true,
      outreachExperience: true,
      discoverySource: true,
    },
  })

  // Admins bypass onboarding requirement
  if (dbUser?.role === 'admin') return user

  if (!dbUser || !hasCompletedOnboarding(dbUser)) {
    throw new OnboardingRequiredError()
  }

  return user
}

export async function requireActiveAdmin(request: Request): Promise<AuthUser> {
  const user = await getAuthUser(request)
  if (!user) {
    throw new AuthRequiredError()
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.uid },
    select: { role: true, status: true },
  })

  if (!dbUser || dbUser.role !== 'admin') {
    throw new ForbiddenError()
  }

  if (dbUser.status !== 'ACTIVE') {
    throw new InactiveUserError()
  }

  return user
}
