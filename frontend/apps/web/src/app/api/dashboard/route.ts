import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireFullyAuthorized,
  handleAuthApiError,
  AuthRequiredError,
  InactiveUserError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
  PendingApprovalError,
} from '@/lib/auth'
import { getPosts } from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    let totalLeadsCount = 0
    try {
      const postsRes = await getPosts({ perPage: 1 })
      totalLeadsCount = postsRes.counts?.all || 0
    } catch {
      totalLeadsCount = await db.leadPost
        .count({
          where: { review_status: 'approved', is_deleted: false },
        })
        .catch(() => 0)
    }

    const [user, userStates] = await Promise.all([
      db.user
        .findUnique({
          where: { id: userId },
          select: {
            plan: true,
            creditAccount: {
              select: {
                subscriptionBalance: true,
                bonusBalance: true,
                rolloverBalance: true,
              },
            },
          },
        })
        .catch((err) => {
          console.warn('[Dashboard API] Failed to fetch user info:', err)
          return null
        }),
      db.userLeadState
        .findMany({
          where: { userId },
          select: {
            status: true,
            isSaved: true,
            lastActionDate: true,
            lead: {
              select: {
                keyword: true,
                platform: true,
                niche: true,
                title: true,
              },
            },
          },
        })
        .catch((err) => {
          console.warn('[Dashboard API] Failed to fetch user lead states:', err)
          return []
        }),
    ])

    const totalCredits =
      (user?.creditAccount?.subscriptionBalance ?? 0) +
      (user?.creditAccount?.bonusBalance ?? 0) +
      (user?.creditAccount?.rolloverBalance ?? 0)
    const creditsRemaining = totalCredits
    const planCredits = user?.plan === 'FREELANCER' ? 500 : user?.plan === 'AGENCY' ? 1000 : 50

    let activeConversationsCount = 0
    let activeConversationsThisWeek = 0
    let readyForOutreachCount = 0
    let repliedCount = 0
    let contactedCount = 0
    let savedLeadsCount = 0

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const activityMap = new Map<string, number>()
    dayNames.forEach((d) => activityMap.set(d, 0))
    const nicheCounts = new Map<string, number>()

    for (const state of userStates || []) {
      const s = state.status
      const actionDate = state.lastActionDate ? new Date(state.lastActionDate) : null
      const isValidDate = actionDate && !isNaN(actionDate.getTime())

      if (['drafting', 'sent', 'replied', 'follow-up'].includes(s)) {
        activeConversationsCount++
        if (isValidDate && actionDate >= sevenDaysAgo) {
          activeConversationsThisWeek++
        }
      }
      if (['saved', 'drafting'].includes(s)) {
        readyForOutreachCount++
      }
      if (s === 'replied') {
        repliedCount++
      }
      if (['sent', 'follow-up', 'replied'].includes(s)) {
        contactedCount++
      }
      if (state.isSaved) {
        savedLeadsCount++
        const tag = state.lead?.niche || state.lead?.keyword?.replace(/^watchlist:/, '') || state.lead?.platform || 'General'
        nicheCounts.set(tag, (nicheCounts.get(tag) || 0) + 1)
      }
      if (isValidDate && actionDate >= sevenDaysAgo) {
        const dayName = dayNames[actionDate.getDay()]
        if (dayName) {
          activityMap.set(dayName, (activityMap.get(dayName) || 0) + 1)
        }
      }
    }

    const responseRate =
      contactedCount > 0 ? Math.round((repliedCount / contactedCount) * 100) : 0

    const activity = dayNames.map((day) => ({
      day,
      value: activityMap.get(day) || 0,
    }))

    const colors = ['mint', 'purple']
    const distribution = [...nicheCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count], i) => ({
        label,
        count,
        color: colors[i % colors.length] as 'mint' | 'purple',
      }))

    const stats = [
      {
        label: 'Signals Intercepted',
        value: totalLeadsCount.toLocaleString(),
        trend: `${savedLeadsCount} saved`,
        trendUp: savedLeadsCount > 0,
        accent: 'mint' as const,
      },
      {
        label: 'Active Conversations',
        value: activeConversationsCount.toString(),
        trend: `${activeConversationsThisWeek} active this week`,
        trendUp: activeConversationsThisWeek > 0,
        accent: 'purple' as const,
      },
      {
        label: 'Response Rate',
        value: contactedCount > 0 ? `${responseRate}%` : '--',
        trend: contactedCount > 0 ? `${repliedCount}/${contactedCount} replied` : 'No contacts yet',
        trendUp: responseRate >= 20,
        accent: 'mint' as const,
      },
      {
        label: 'Credits Remaining',
        value: creditsRemaining.toLocaleString(),
        trend: `/ ${planCredits.toLocaleString()}`,
        accent: 'purple' as const,
      },
    ]

    return NextResponse.json({
      data: {
        stats,
        activity,
        distribution,
        readyForOutreachCount,
      },
    })
  } catch (error: unknown) {
    const authResponse = handleAuthApiError(error)
    if (authResponse) return authResponse

    const errName = (error as any)?.name || (error instanceof Error ? error.constructor.name : '')
    if (error instanceof AuthRequiredError || errName === 'AuthRequiredError') {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    if (error instanceof InactiveUserError || errName === 'InactiveUserError') {
      return NextResponse.json(
        { code: 'INACTIVE', message: (error as Error)?.message || 'Your account is not active' },
        { status: 403 },
      )
    }
    if (error instanceof PendingApprovalError || errName === 'PendingApprovalError') {
      return NextResponse.json(
        { code: 'PENDING_APPROVAL', message: 'Your application is under review' },
        { status: 403 },
      )
    }
    if (error instanceof EmailNotVerifiedError || errName === 'EmailNotVerifiedError') {
      return NextResponse.json(
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address first' },
        { status: 403 },
      )
    }
    if (error instanceof OnboardingRequiredError || errName === 'OnboardingRequiredError') {
      return NextResponse.json(
        { code: 'ONBOARDING_REQUIRED', message: 'Please complete onboarding first' },
        { status: 403 },
      )
    }

    console.error('[Dashboard API] GET error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve dashboard statistics' },
      { status: 500 },
    )
  }
}
