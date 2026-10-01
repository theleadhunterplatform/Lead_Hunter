import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, AuthRequiredError, ForbiddenError } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

let cachedTemplates: any = null
let cachedTemplatesExpiresAt = 0
const TEMPLATES_CACHE_TTL_MS = 30_000 // 30s server-side cache

export function invalidateBroadcastTemplatesCache() {
  cachedTemplates = null
  cachedTemplatesExpiresAt = 0
}

const createTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Template name must be at least 2 characters'),
  subject: z.string().min(2, 'Subject must be at least 2 characters'),
  body: z.string().min(5, 'Body must be at least 5 characters'),
  category: z.string().default('general'),
})

const DEFAULT_LIFECYCLE_TEMPLATES = [
  {
    id: 'tpl-auto-account-approved',
    name: '⚡ When User Account is Approved (Welcome Email)',
    subject: 'Welcome to Lead Hunter Club! Your account is approved 🎉',
    category: 'automated',
    body: `Hi {{name}},

Congratulations! Your Lead Hunter Club account has been officially approved. You now have full access to verified client leads with zero competition.

We've credited your account with {{credits}} free credits so you can start pitching immediately.

Log in to your member portal:
{{appUrl}}/login

Welcome aboard,
The Lead Hunter Club Team`,
  },
  {
    id: 'tpl-auto-plan-upgrade',
    name: '🚀 When User Upgrades Plan',
    subject: 'Your plan has been upgraded to {{plan}} 🚀',
    category: 'automated',
    body: `Hi {{name}},

Your Lead Hunter Club subscription has successfully upgraded from {{oldPlan}} to {{plan}}!

Your new monthly allowance is {{credits}} credits. Any existing unexpired credits have been rolled over to your account.

Open your updated dashboard:
{{appUrl}}/dashboard

Happy hunting,
The Lead Hunter Club Team`,
  },
  {
    id: 'tpl-auto-plan-downgrade',
    name: '🔻 When User Downgrades Plan',
    subject: 'Your plan has been changed to {{plan}}',
    category: 'automated',
    body: `Hi {{name}},

Your Lead Hunter Club subscription has transitioned from {{oldPlan}} to {{plan}}.

Your active credits balance is currently {{credits}} credits. You can upgrade back anytime or refill extra credits as needed.

Manage your subscription:
{{appUrl}}/settings

Best regards,
The Lead Hunter Club Team`,
  },
  {
    id: 'tpl-auto-plan-change',
    name: '🔄 When User Changes Plan',
    subject: 'Your plan change confirmation — {{plan}}',
    category: 'automated',
    body: `Hi {{name}},

Your subscription plan has been updated to {{plan}}.

Your current credit balance is {{credits}} credits.

View your account details:
{{appUrl}}/settings

Best regards,
The Lead Hunter Club Team`,
  },
  {
    id: 'tpl-auto-credit-topup',
    name: '💰 When User Gets a Credit Topup',
    subject: '+{{addedCredits}} Credits Added to your Lead Hunter Account 💰',
    category: 'automated',
    body: `Hi {{name}},

Great news! {{addedCredits}} credits have been added to your Lead Hunter Club balance.

Your new total balance is {{newTotal}} credits. They never expire as long as your membership is in good standing.

Start claiming fresh client leads now:
{{appUrl}}/leads

Happy hunting,
The Lead Hunter Club Team`,
  },
  {
    id: 'tpl-auto-low-credits',
    name: '📉 When Credits Drop <= 2 Coins (Low Credits Alert)',
    subject: 'You have only {{creditsRemaining}} credits left — Top up to keep hunting',
    category: 'automated',
    body: `Hi {{name}},

You're running low on credits! You currently have {{creditsRemaining}} credits remaining in your balance.

Don't let high-paying client leads pass by. Grab an instant credit pack and continue claiming hot opportunities:
{{appUrl}}/refill

Best regards,
The Lead Hunter Club Team`,
  },
  {
    id: 'tpl-auto-renewal-reminder',
    name: '📅 3 Days Before Subscription Renews (Renewal Notice)',
    subject: 'Your Lead Hunter {{plan}} subscription renews in {{daysRemaining}} days',
    category: 'automated',
    body: `Hi {{name}},

This is a quick reminder that your {{plan}} subscription is scheduled to renew in {{daysRemaining}} days (on {{renewalDate}}).

Your unused monthly credits will automatically roll over according to your plan rules so you never lose what you've earned.

Manage your account & billing:
{{appUrl}}/settings

Best,
The Lead Hunter Club Team`,
  },
  {
    id: 'tpl-auto-application-received',
    name: '📝 When Onboarding / Application is Submitted',
    subject: 'We received your Lead Hunter Club application 📋',
    category: 'automated',
    body: `Hi {{name}},

Thanks for applying to join Lead Hunter Club!

We review all applications manually to ensure our client leads maintain exceptional quality and stay free from spam.

We typically review new applicants within 24-48 hours. Keep an eye on your inbox!

Best,
The Lead Hunter Club Team`,
  },
  {
    id: 'tpl-auto-account-rejected',
    name: '❌ When Application is Rejected',
    subject: 'Update regarding your Lead Hunter Club application',
    category: 'automated',
    body: `Hi {{name}},

Thank you for your interest in joining Lead Hunter Club.

After carefully reviewing your application and profile, we are unable to approve your account at this time. We maintain strict membership criteria to align with our current lead acquisition pipeline.

We welcome you to re-apply in the future as our member intake expands.

Best regards,
The Lead Hunter Club Team`,
  },
  {
    id: 'tpl-auto-account-suspended',
    name: '🚫 When Account is Suspended',
    subject: 'Important notice regarding your Lead Hunter Club account',
    category: 'automated',
    body: `Hi {{name}},

Your Lead Hunter Club account has been temporarily suspended due to a violation of our community standards or terms of service.

If you believe this is an error, please reply to this email to contact member support.

Lead Hunter Club Support`,
  },
]

/**
 * GET: Lists all available broadcast templates.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const now = Date.now()
    if (cachedTemplates && now < cachedTemplatesExpiresAt) {
      return NextResponse.json(
        {
          success: true,
          templates: cachedTemplates,
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
            'X-Cache': 'HIT',
          },
        },
      )
    }

    const dbTemplates = await db.broadcastTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const existingIds = new Set(dbTemplates.map((t) => t.id))
    const missingDefaults = DEFAULT_LIFECYCLE_TEMPLATES.filter((d) => !existingIds.has(d.id)).map((d) => ({
      ...d,
      createdById: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    const templates = [...dbTemplates, ...missingDefaults]

    cachedTemplates = templates
    cachedTemplatesExpiresAt = now + TEMPLATES_CACHE_TTL_MS

    return NextResponse.json(
      {
        success: true,
        templates,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
          'X-Cache': 'MISS',
        },
      },
    )
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to fetch broadcast templates'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}

/**
 * POST: Creates a new broadcast template.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const body = await request.json()
    const parsed = createTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid template data',
        },
        { status: 400 },
      )
    }

    const customId = parsed.data.id?.trim()
    const newTemplate = customId
      ? await db.broadcastTemplate.upsert({
          where: { id: customId },
          update: {
            name: parsed.data.name,
            subject: parsed.data.subject,
            body: parsed.data.body,
            category: parsed.data.category,
          },
          create: {
            id: customId,
            name: parsed.data.name,
            subject: parsed.data.subject,
            body: parsed.data.body,
            category: parsed.data.category,
            createdById: admin.id,
          },
        })
      : await db.broadcastTemplate.create({
          data: {
            name: parsed.data.name,
            subject: parsed.data.subject,
            body: parsed.data.body,
            category: parsed.data.category,
            createdById: admin.id,
          },
        })

    invalidateBroadcastTemplatesCache()

    return NextResponse.json({
      success: true,
      template: newTemplate,
      message: 'Template created successfully',
    })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError || error instanceof ForbiddenError) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Admin access required' }, { status: 403 })
    }
    const msg = error instanceof Error ? error.message : 'Failed to save broadcast template'
    return NextResponse.json({ code: 'ERROR', message: msg }, { status: 500 })
  }
}
