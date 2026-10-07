import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, ForbiddenError, AuthRequiredError, hasCompletedOnboarding } from '@/lib/auth'
import { formatPaymentLog } from '@/lib/payments-format'
import {
  SERVICE_CATEGORIES,
  EXPERIENCE_LEVELS,
} from '@/lib/onboarding-options'

export const dynamic = 'force-dynamic'

interface CountItem {
  label: string
  count: number
}

function sortCounts(map: Map<string, number>): CountItem[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      users,
      paymentLogs,
      leadStates,
      openTickets,
      pendingProofs,
      subscribers,
      referralCount,
    ] = await Promise.all([
      db.user.findMany({
        select: {
          id: true,
          status: true,
          plan: true,
          createdAt: true,
          servicesOffered: true,
          preferredLeadCategories: true,
          outreachExperience: true,
          discoverySource: true,
          phone: true,
          linkedin: true,
        },
      }),
      db.auditLog.findMany({
        where: { action: 'PAYMENT_CREDITED' },
        select: { id: true, userId: true, createdAt: true, details: true },
      }),
      db.userLeadState.findMany({
        where: { OR: [{ isRevealed: true }, { isSaved: true }] },
        select: { userId: true, isRevealed: true, isSaved: true },
      }),
      db.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      db.milestoneProof.count({ where: { status: 'PENDING' } }),
      db.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } }),
      db.referral.count(),
    ])

    // ── Persona ────────────────────────────────────────────────────────────
    const serviceGroupCount = new Map<string, number>()
    const serviceCount = new Map<string, number>()
    const experienceCount = new Map<string, number>()
    const sourceCount = new Map<string, number>()
    const nicheCount = new Map<string, number>()
    let personaUsers = 0

    for (const u of users) {
      if (u.servicesOffered.length > 0) personaUsers++
      for (const s of u.servicesOffered) {
        serviceCount.set(s, (serviceCount.get(s) || 0) + 1)
        const group = SERVICE_CATEGORIES.find((g) => g.items.includes(s))
        const gid = group ? group.id : 'other'
        serviceGroupCount.set(gid, (serviceGroupCount.get(gid) || 0) + 1)
      }
      if (u.outreachExperience) {
        experienceCount.set(u.outreachExperience, (experienceCount.get(u.outreachExperience) || 0) + 1)
      }
      if (u.discoverySource) {
        sourceCount.set(u.discoverySource, (sourceCount.get(u.discoverySource) || 0) + 1)
      }
      for (const c of u.preferredLeadCategories) {
        nicheCount.set(c, (nicheCount.get(c) || 0) + 1)
      }
    }

    const servicesByGroup = SERVICE_CATEGORIES.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      count: serviceGroupCount.get(g.id) || 0,
    }))
    const otherGroupCount = serviceGroupCount.get('other') || 0
    if (otherGroupCount > 0) {
      servicesByGroup.push({ id: 'other', name: 'Other Services', icon: '🗂️', count: otherGroupCount })
    }
    servicesByGroup.sort((a, b) => b.count - a.count)

    const experience = [
      ...EXPERIENCE_LEVELS.map((e) => ({ label: e.label, count: experienceCount.get(e.value) || 0 })),
    ]
    const knownExp = new Set(EXPERIENCE_LEVELS.map((e) => e.value))
    let legacyExperience = 0
    for (const [value, count] of experienceCount) {
      if (!knownExp.has(value)) legacyExperience += count
    }
    if (legacyExperience > 0) experience.push({ label: 'Other', count: legacyExperience })

    const persona = {
      personaUsers,
      servicesByGroup,
      topServices: sortCounts(serviceCount).slice(0, 10),
      experience,
      discoverySources: sortCounts(sourceCount),
      topLeadCategories: sortCounts(nicheCount).slice(0, 10),
    }

    // ── Growth ─────────────────────────────────────────────────────────────
    const WEEK = 7 * 24 * 60 * 60 * 1000
    const weekly: CountItem[] = []
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now.getTime() - i * WEEK)
      const start = new Date(end.getTime() - WEEK)
      const count = users.filter((u) => u.createdAt >= start && u.createdAt < end).length
      weekly.push({
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      })
    }

    const totalUsers = users.length
    const activeUsers = users.filter((u) => u.status === 'ACTIVE').length
    const onboarded = users.filter((u) => hasCompletedOnboarding(u)).length
    const growth = {
      weekly,
      totalUsers,
      activeUsers,
      onboarded,
      conversionPct: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
      onboardingPct: totalUsers > 0 ? Math.round((onboarded / totalUsers) * 100) : 0,
      signups7d: users.filter((u) => u.createdAt >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length,
      signups30d: users.filter((u) => u.createdAt >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)).length,
    }

    // ── Revenue & plans ────────────────────────────────────────────────────
    const payments = paymentLogs.map((log) => formatPaymentLog(log))
    const planCounts = new Map<string, number>()
    for (const u of users) planCounts.set(u.plan, (planCounts.get(u.plan) || 0) + 1)
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const monthRevenue = payments
      .filter((p) => new Date(p.createdAt) >= startOfMonth)
      .reduce((sum, p) => sum + (p.amount || 0), 0)
    const revenue = {
      planMix: sortCounts(planCounts),
      paidUsers: users.filter((u) => u.plan !== 'FREE').length,
      totalRevenue,
      monthRevenue,
      paymentCount: payments.length,
    }

    // ── Activation ─────────────────────────────────────────────────────────
    const revealedUsers = new Set<string>()
    const savedUsers = new Set<string>()
    for (const s of leadStates) {
      if (s.isRevealed) revealedUsers.add(s.userId)
      if (s.isSaved) savedUsers.add(s.userId)
    }
    const activation = {
      signedUp: totalUsers,
      onboarded,
      revealedUsers: revealedUsers.size,
      savedUsers: savedUsers.size,
    }

    // ── Ops ────────────────────────────────────────────────────────────────
    const ops = {
      openTickets,
      pendingProofs,
      subscribers,
      referrals: referralCount,
    }

    return NextResponse.json(
      { data: { persona, growth, revenue, activation, ops } },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } },
    )
  } catch (error: unknown) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Admin access required' },
        { status: 403 },
      )
    }
    if (error instanceof AuthRequiredError || (error instanceof Error && error.name === 'AuthRequiredError')) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    console.error('[Admin Insights API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      { status: 500 },
    )
  }
}
