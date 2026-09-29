import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const DEFAULT_EMAIL_AUTOMATION_CONFIG = {
  auto_email_enabled: true,
  renewal_reminders_enabled: true,
  low_credits_nudge_enabled: true,
  onboarding_emails_enabled: true,
  plan_change_emails_enabled: true,
  topup_emails_enabled: true,
}

export type EmailAutomationConfig = typeof DEFAULT_EMAIL_AUTOMATION_CONFIG

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const setting = await db.setting.findUnique({
      where: { key: 'email_automation_config' },
    })

    const config: EmailAutomationConfig = {
      ...DEFAULT_EMAIL_AUTOMATION_CONFIG,
      ...((setting?.value as Record<string, any>) || {}),
    }

    return NextResponse.json({
      success: true,
      data: config,
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch automation settings'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)
    const body = await request.json().catch(() => ({}))

    // Handle Manual Trigger Action
    if (body.action === 'trigger_now') {
      const now = new Date()
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Find upcoming renewals in the next 3 days
      const upcomingRenewals = await db.creditAccount.findMany({
        where: {
          renewalDate: { gte: now, lte: threeDaysFromNow },
          user: { plan: { not: 'FREE' } },
        },
        include: {
          user: { select: { id: true, name: true, email: true, plan: true } },
        },
      })

      const { emailService } = await import('@/lib/services/email')
      let renewalNoticesSent = 0
      let renewalNoticesSkipped = 0

      for (const item of upcomingRenewals) {
        if (item.user?.email && item.renewalDate) {
          const recentReminder = await db.emailLog.findFirst({
            where: {
              to: item.user.email,
              type: 'renewal_reminder',
              sentAt: { gte: sevenDaysAgo },
            },
          })

          if (recentReminder) {
            renewalNoticesSkipped++
            continue
          }

          const daysRemaining = Math.max(
            1,
            Math.ceil((item.renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
          )
          const formattedDate = item.renewalDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

          const res = await emailService.sendRenewalNotice(
            { name: item.user.name || '', email: item.user.email },
            daysRemaining,
            item.user.plan,
            formattedDate,
          )

          if (res.success) {
            renewalNoticesSent++
          } else {
            renewalNoticesSkipped++
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Lifecycle trigger executed: ${renewalNoticesSent} renewal notices sent, ${renewalNoticesSkipped} skipped or logged.`,
        data: {
          scanned: upcomingRenewals.length,
          sent: renewalNoticesSent,
          skipped: renewalNoticesSkipped,
        },
      })
    }

    // Handle Automation Toggle Update
    const currentSetting = await db.setting.findUnique({
      where: { key: 'email_automation_config' },
    })

    const existingConfig: EmailAutomationConfig = {
      ...DEFAULT_EMAIL_AUTOMATION_CONFIG,
      ...((currentSetting?.value as Record<string, any>) || {}),
    }

    let updatedConfig: EmailAutomationConfig

    if (body.key && typeof body.value === 'boolean') {
      updatedConfig = {
        ...existingConfig,
        [body.key]: body.value,
      }
    } else {
      updatedConfig = {
        ...existingConfig,
        ...(typeof body.auto_email_enabled === 'boolean' ? { auto_email_enabled: body.auto_email_enabled } : {}),
        ...(typeof body.renewal_reminders_enabled === 'boolean' ? { renewal_reminders_enabled: body.renewal_reminders_enabled } : {}),
        ...(typeof body.low_credits_nudge_enabled === 'boolean' ? { low_credits_nudge_enabled: body.low_credits_nudge_enabled } : {}),
        ...(typeof body.onboarding_emails_enabled === 'boolean' ? { onboarding_emails_enabled: body.onboarding_emails_enabled } : {}),
        ...(typeof body.plan_change_emails_enabled === 'boolean' ? { plan_change_emails_enabled: body.plan_change_emails_enabled } : {}),
        ...(typeof body.topup_emails_enabled === 'boolean' ? { topup_emails_enabled: body.topup_emails_enabled } : {}),
      }
    }

    const saved = await db.setting.upsert({
      where: { key: 'email_automation_config' },
      update: { value: updatedConfig },
      create: {
        key: 'email_automation_config',
        value: updatedConfig,
        description: 'Email automation switches for lifecycle dispatches',
      },
    })

    return NextResponse.json({
      success: true,
      data: saved.value,
      message: 'Email automation settings updated successfully',
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to update automation settings'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
