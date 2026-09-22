import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, AuthRequiredError } from '@/lib/auth'
import { rateLimitByKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const COPILOT_SYSTEM_PROMPT = `You are "Hunter Copilot", the 24/7 dedicated platform support and instant FAQ assistant for Lead Hunter Club (leadhunterclub.com).
Your purpose is to answer member questions regarding the platform, credit costs, plans, exclusivity, contact verification, and support escalation.
Format your responses with clean, concise markdown, bullet points, and an encouraging tone.

### Platform Knowledge Base:
1. **Credits & Pricing**:
   - Credits (coins) are used to reveal verified contact info for high-intent B2B leads.
   - Default reveal cost is based on contact bundles (usually 2–10 coins, e.g. Email = 5 Cr, Full Bundle = 10 Cr).
   - High-ticket, big-brand, or international leads may have a custom credit cost (e.g. 15, 20, 25 Cr) set by admins, which overrides default pricing.
   - The exact cost is always clearly visible on the lead badge and in the reveal drawer before unlocking.

2. **Exclusive Claim Policy (Zero Spam)**:
   - When a member reveals a lead, that lead is locked exclusively for them.
   - Other members cannot claim or reveal the same lead. This protects your outreach from competing with dozens of agencies.

3. **Plans, Refills & Renewals**:
   - Monthly plans include credit allocations refreshed every billing cycle.
   - Members who run low can purchase Instant Credit Refills at /refill or upgrade their subscription at /pricing.
   - Subscriptions and payment details can be managed anytime in /settings.

4. **Contact Quality & Verification**:
   - Contacts are scraped in real-time and enriched via Hunter.io, Apollo, and deep profile signals.
   - Indicators show whether an email is a verified direct inbox or company domain.

5. **Refunds on Invalid Contacts**:
   - If a revealed email bounces or is demonstrably invalid, members can request a 100% credit refund.
   - To get a credit refund, open a quick ticket on /support with the Lead ID.

6. **Human Support Escalation**:
   - If the user has a billing issue, technical glitch, or needs human assistance, direct them to /support to click "New Ticket". Admins respond promptly.

Keep responses under 150 words whenever possible. Focus directly on the user's question.`

function getDeterministicFaqAnswer(query: string): string {
  const q = query.toLowerCase()

  if (q.includes('credit') || q.includes('coin') || q.includes('cost') || q.includes('how much') || q.includes('override') || q.includes('price')) {
    return `**Credits & Reveal Costs in Lead Hunter Club:**
• **Base Cost**: Regular leads cost **2 to 10 credits** depending on the contact bundle available (e.g. Email = 5 Cr, Full Bundle = 10 Cr).
• **Custom Overrides**: Solid, big-brand, or high-budget international leads may have a custom credit cost (e.g., 15 Cr or 20 Cr) set by admins.
• **Full Transparency**: The exact cost is always displayed right on the lead badge and in the slide-out drawer before you reveal.
• Need more credits? Top up anytime on the [/refill](/refill) page!`
  }

  if (q.includes('exclusive') || q.includes('claim') || q.includes('other member') || q.includes('lock') || q.includes('spam')) {
    return `**Lead Exclusivity Guarantee:**
• **1-to-1 Protection**: Once you reveal and claim a lead, **no other member can unlock or claim it**.
• **Zero Fatigue**: This ensures the client isn't spammed by dozens of other people, giving you maximum response rates on your pitch.`
  }

  if (q.includes('refund') || q.includes('bounce') || q.includes('invalid') || q.includes('fake') || q.includes('bad email')) {
    return `**Credit Refund Policy:**
• If an unlocked email bounces or is demonstrably invalid, **we refund your credits 100%**.
• Simply go to the [/support](/support) page, click **"New Ticket"**, and share the Lead ID and bounce message. Our admin team will credit your account promptly.`
  }

  if (q.includes('renew') || q.includes('plan') || q.includes('subscription') || q.includes('cancel') || q.includes('upgrade') || q.includes('refill')) {
    return `**Plans, Renewals & Refills:**
• **Monthly Renewal**: Your plan renews automatically on your billing cycle date, resetting your credit quota.
• **Top-ups**: If you run out of credits mid-month, you can buy instant credit packs at [/refill](/refill).
• **Upgrade / Downgrade**: You can switch plans at [/pricing](/pricing) or manage cancellation in [/settings](/settings).`
  }

  if (q.includes('support') || q.includes('human') || q.includes('ticket') || q.includes('admin') || q.includes('help') || q.includes('contact support')) {
    return `**Contact Human Support:**
• Our admin team is ready to help with account, billing, or technical queries.
• Visit [/support](/support) and click **"New Ticket"** to open a direct support thread. We actively monitor and resolve tickets!`
  }

  if (q.includes('niche') || q.includes('filter') || q.includes('new lead') || q.includes('drop') || q.includes('when')) {
    return `**Lead Drops & Niches:**
• Leads are gathered from real-time client posts across LinkedIn, Twitter/X, Reddit, and curated sources.
• New qualified leads are approved and published multiple times throughout the day.
• Use the niche filters (SaaS, AI Automation, Web Dev, Video Editing, etc.) on [/leads](/leads) to find exact-match opportunities.`
  }

  return `**Hunter Copilot (24/7 Support):**
I'm here to help you navigate Lead Hunter Club smoothly! Here are the most common things members ask about:

• **Credits**: Learn how credit costs and custom lead rates work.
• **Exclusivity**: How 1-to-1 lead claims protect you from outreach spam.
• **Refunds**: Getting credits back if an unlocked email bounces.
• **Plans & Refills**: Managing subscriptions on [/settings](/settings) or buying extra credits on [/refill](/refill).
• **Human Support**: Opening a ticket on [/support](/support).

What can I clarify for you?`
}

async function callLlm(messages: ChatMessage[]): Promise<string> {
  const { GEMINI_API_KEY, OPENAI_API_KEY } = process.env

  // 1. Try Gemini
  if (GEMINI_API_KEY) {
    try {
      const promptHistory = messages.map((m) => `${m.role === 'user' ? 'User' : 'Hunter Copilot'}: ${m.content}`).join('\n\n')
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
                    text: `${COPILOT_SYSTEM_PROMPT}\n\nConversation:\n${promptHistory}\n\nHunter Copilot:`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 350,
            },
          }),
        },
      )
      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text.trim()
      }
    } catch (e) {
      console.warn('[Hunter Copilot] Gemini call failed, trying next provider:', e)
    }
  }

  // 2. Try OpenAI
  if (OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: COPILOT_SYSTEM_PROMPT },
            ...messages.slice(-6),
          ],
          temperature: 0.3,
          max_tokens: 350,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text) return text.trim()
      }
    } catch (e) {
      console.warn('[Hunter Copilot] OpenAI call failed:', e)
    }
  }

  // 3. Deterministic Knowledge Base Fallback
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || ''
  return getDeterministicFaqAnswer(lastUserMsg)
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request)
    const userId = authUser.uid

    const rl = await rateLimitByKey(`user:${userId}:copilot`, 25, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait a few seconds before asking again.',
        },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { message, history } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const conversationHistory: ChatMessage[] = Array.isArray(history)
      ? history.slice(-6).map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || ''),
        }))
      : []

    conversationHistory.push({ role: 'user', content: message.trim() })

    const reply = await callLlm(conversationHistory)

    return NextResponse.json({ reply })
  } catch (error: unknown) {
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('[Hunter Copilot] Error:', error)
    return NextResponse.json(
      {
        reply:
          "I'm experiencing a brief connection hiccup. For urgent platform assistance, please visit [/support](/support) to open a priority ticket!",
      },
      { status: 200 },
    )
  }
}
