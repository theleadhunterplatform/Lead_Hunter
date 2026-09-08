import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireFullyAuthorized, AuthRequiredError, InactiveUserError, EmailNotVerifiedError, OnboardingRequiredError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const user = await db.user.findUnique({
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

    const totalCredits =
      (user?.creditAccount?.subscriptionBalance ?? 0) +
      (user?.creditAccount?.bonusBalance ?? 0) +
      (user?.creditAccount?.rolloverBalance ?? 0)
    const creditsRemaining = totalCredits
    const planCredits = user?.plan === 'FREELANCER' ? 500 : user?.plan === 'AGENCY' ? 1000 : 50

    let totalLeadsCount = 0
    try {
      totalLeadsCount = await db.leadPost.count({
        where: { review_status: 'approved', is_deleted: false },
      })
    } catch {
      totalLeadsCount = 0
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const activeConversationsCount = await db.userLeadState.count({
      where: {
        userId,
        status: { in: ['drafting', 'sent', 'replied', 'follow-up'] },
      },
    })

    const activeConversationsThisWeek = await db.userLeadState.count({
      where: {
        userId,
        status: { in: ['drafting', 'sent', 'replied', 'follow-up'] },
        lastActionDate: { gte: sevenDaysAgo },
      },
    })

    const readyForOutreachCount = await db.userLeadState.count({
      where: {
        userId,
        status: { in: ['saved', 'drafting'] },
      },
    })

    const repliedCount = await db.userLeadState.count({
      where: { userId, status: 'replied' },
    })
    const contactedCount = await db.userLeadState.count({
      where: { userId, status: { in: ['sent', 'follow-up', 'replied'] } },
    })
    const responseRate =
      contactedCount > 0 ? Math.round((repliedCount / contactedCount) * 100) : 0

    const savedLeadsCount = await db.userLeadState.count({
      where: { userId, isSaved: true },
    })

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const recentActivity = await db.userLeadState.findMany({
      where: {
        userId,
        lastActionDate: { gte: sevenDaysAgo },
      },
      select: { lastActionDate: true },
    })
    const activityMap = new Map<string, number>()
    dayNames.forEach((d) => activityMap.set(d, 0))
    recentActivity.forEach((state) => {
      if (state.lastActionDate) {
        const dayName = dayNames[state.lastActionDate.getDay()]
        activityMap.set(dayName, (activityMap.get(dayName) || 0) + 1)
      }
    })
    const activity = dayNames.map((day) => ({
      day,
      value: activityMap.get(day) || 0,
    }))

    const savedLeadsWithTags = await db.userLeadState.findMany({
      where: { userId, isSaved: true },
      include: { lead: { select: { keyword: true, platform: true } } },
    })
    const nicheCounts = new Map<string, number>()
    savedLeadsWithTags.forEach((uls) => {
      const tag = uls.lead?.keyword?.replace(/^watchlist:/, '') || uls.lead?.platform || 'General'
      nicheCounts.set(tag, (nicheCounts.get(tag) || 0) + 1)
    })
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
