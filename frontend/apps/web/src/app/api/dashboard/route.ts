import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireFullyAuthorized, AuthRequiredError, InactiveUserError, EmailNotVerifiedError, OnboardingRequiredError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [user, totalLeadsCount, userStates] = await Promise.all([
      db.user.findUnique({
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
      }),
      db.leadPost
        .count({
          where: { review_status: 'approved', is_deleted: false },
        })
        .catch(() => 0),
      db.userLeadState.findMany({
        where: { userId },
        select: {
          status: true,
          isSaved: true,
          lastActionDate: true,
          lead: { select: { keyword: true, platform: true } },
        },
      }),
    ])

    const totalCredits =
      (user?.creditAccount?.subscriptionBalance ?? 0) +
      (user?.creditAccount?.bonusBalance ?? 0) +
      (user?.creditAccount?.rolloverBalance ?? 0)
    const creditsRemaining = totalCredits
    const planCredits = user?.plan === 'FREELANCER' ? 500 : user?.plan === 'AGENCY' ? 1000 : 50

    // Compute all counts in memory in 0.01ms instead of 7 separate database round-trips
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

    for (const state of userStates) {
      const s = state.status
      if (['drafting', 'sent', 'replied', 'follow-up'].includes(s)) {
        activeConversationsCount++
        if (state.lastActionDate && state.lastActionDate >= sevenDaysAgo) {
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
        const tag = state.lead?.keyword?.replace(/^watchlist:/, '') || state.lead?.platform || 'General'
        nicheCounts.set(tag, (nicheCounts.get(tag) || 0) + 1)
      }
      if (state.lastActionDate && state.lastActionDate >= sevenDaysAgo) {
        const dayName = dayNames[state.lastActionDate.getDay()]
        activityMap.set(dayName, (activityMap.get(dayName) || 0) + 1)
      }
    }

    const responseRate = contactedCount > 0 ? Math.round((repliedCount / contactedCount) * 100) : 0

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
    if (error instanceof AuthRequiredError) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      )
    }
    if (error instanceof InactiveUserError) {
      return NextResponse.json(
        { code: 'INACTIVE', message: 'Your account is not active' },
        { status: 403 },
      )
    }
    if (error instanceof EmailNotVerifiedError) {
      return NextResponse.json(
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address first' },
        { status: 403 },
      )
    }
    if (error instanceof OnboardingRequiredError) {
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
