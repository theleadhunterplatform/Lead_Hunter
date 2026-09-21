import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  requireFullyAuthorized,
  AuthRequiredError,
  InactiveUserError,
  EmailNotVerifiedError,
  OnboardingRequiredError,
} from '@/lib/auth'
import { outreachGenerateSchema } from '@/lib/validators/auth'
import { rateLimitByKey } from '@/lib/rate-limit'
import { creditService, InsufficientCreditsError } from '@/lib/services/credits'
import { getPost } from '@/lib/external-api/client'

export const dynamic = 'force-dynamic'

async function generateOutreach(prompt: string, context: string): Promise<string> {
  const { OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY } = process.env

  try {
    if (OPENAI_API_KEY) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are an elite B2B copywriter. Write a highly personalized, short, punchy outreach message based on the provided lead intel. Do not be overly formal. No subject lines.',
            },
            { role: 'user', content: `Lead Context: ${context}\n\nTask: ${prompt}` },
          ],
          temperature: 0.7,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.choices[0].message.content
      }
    }

    if (ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 300,
          system:
            'You are an elite B2B copywriter. Write a highly personalized, short, punchy outreach message. No subject lines.',
          messages: [{ role: 'user', content: `Lead Context: ${context}\n\nTask: ${prompt}` }],
          temperature: 0.7,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return data.content[0].text
      }
    }

    if (GEMINI_API_KEY) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an elite B2B copywriter. Write a short, personalized outreach message based on this lead. No subject lines. Keep it under 3 sentences. Sound human, not like AI.

Lead Context: ${context}
Angle: ${prompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 200,
            },
          }),
        },
      )
      if (res.ok) {
        const data = await res.json()
        return data.candidates[0].content.parts[0].text
      }
    }

    if (OPENAI_API_KEY || ANTHROPIC_API_KEY || GEMINI_API_KEY) {
      throw new Error('AI provider returned an error')
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (prompt.toLowerCase().includes('humor')) {
      return "Hey [Name],\n\nI saw you're looking for someone to handle [Task]. Usually, people in your position either do it themselves and hate it, or hire an agency and regret it.\n\nI specialize in [Niche] and I promise to be less painful than both options. Let me know if you're open to a quick chat."
    } else if (prompt.toLowerCase().includes('authority')) {
      return "Hi [Name],\n\nNoticed you're scaling your [Category] efforts. We recently helped a similar company in the [Niche] space achieve a 40% improvement in this exact area.\n\nI've taken a look at what you're doing and I have a few specific ideas on how to optimize it. Worth a quick conversation?"
    } else {
      return "Hey [Name],\n\nSaw your post looking for help with [Task]. Given your focus on [Niche], I thought I'd reach out directly.\n\nI just wrapped up a very similar project and have the bandwidth to tackle this immediately. Happy to send over some relevant case studies if you're interested."
    }
  } catch (error) {
    console.error('[AI Engine] Generation failed:', error)
    throw new Error('Failed to generate outreach')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireFullyAuthorized(request)
    const userId = authUser.uid

    const rl = await rateLimitByKey(`user:${userId}:generate`, 10, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const parsed = outreachGenerateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const { leadId, angle } = parsed.data

    const externalLead = await getPost(leadId)

    const state = await db.userLeadState.findUnique({
      where: { userId_leadId: { userId, leadId } },
    })
    if (!state || !state.isRevealed) {
      throw new MustRevealFirstError()
    }

    const context = `
      Lead Name: ${externalLead.author?.name || 'Unknown'}
      Company: ${externalLead.contact_info?.company_name || ''}
      Role: ${externalLead.contact_info?.title || externalLead.author?.info || ''}
      Buying Signal: ${externalLead.content || ''}
      Keyword/Niche: ${externalLead.keyword || ''}
      AI Qualification: ${externalLead.qualification_reason || ''}
    `

    let prompt = ''
    switch (angle) {
      case 'Curiosity':
        prompt =
          'Write an email that sparks intense curiosity about a specific problem they might not realize they have, based on their task scope. End with a soft call to action.'
        break
      case 'Authority':
        prompt =
          'Write an authoritative email establishing deep expertise in their exact industry. Mention you have frameworks tailored for their specific task.'
        break
      case 'Humor':
        prompt =
          'Write a slightly humorous, pattern-breaking email. Call out the typical boring vendor pitches they receive and offer a refreshing, direct alternative.'
        break
      default:
        prompt = 'Write a standard, highly personalized outreach email.'
    }

    let generatedContent = await generateOutreach(prompt, context)

    const firstName = externalLead.author?.name?.split(' ')[0] || 'there'
    const task = externalLead.content?.split('.')[0] || 'your project'
    const niche = externalLead.keyword || 'your industry'

    generatedContent = generatedContent
      .replace(/\[Name\]/gi, firstName)
      .replace(/\[Task\]/gi, task)
      .replace(/\[Category\]/gi, niche)
      .replace(/\[Niche\]/gi, niche)

    const CREDIT_COST = 2
    const deductResult = await db.$transaction(async (tx) => {
      return creditService.deductInTx(tx, userId, CREDIT_COST, 'outreach_generate', { leadId })
    })

    return NextResponse.json({
      success: true,
      content: generatedContent,
      creditsRemaining: deductResult.subscriptionBalance + deductResult.bonusBalance,
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
        { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before continuing' },
        { status: 403 },
      )
    }
    if (error instanceof OnboardingRequiredError) {
      return NextResponse.json(
        { code: 'ONBOARDING_REQUIRED', message: 'Please complete onboarding first' },
        { status: 403 },
      )
    }
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient credits to generate outreach',
          required: error.required,
        },
        { status: 400 },
      )
    }
    if (error instanceof MustRevealFirstError) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'You must reveal the contact before using AI' },
        { status: 403 },
      )
    }
    console.error('[Outreach API] Error:', error)
    return NextResponse.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate outreach' },
      { status: 500 },
    )
  }
}

class LeadNotFoundError extends Error {
  constructor() {
    super('Lead not found')
    this.name = 'LeadNotFoundError'
  }
}

class MustRevealFirstError extends Error {
  constructor() {
    super('You must reveal the contact before using AI')
    this.name = 'MustRevealFirstError'
  }
}
