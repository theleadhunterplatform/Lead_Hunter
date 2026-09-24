import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuth, AuthRequiredError } from '@/lib/auth'
import { rateLimitByKey } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const COPILOT_SYSTEM_PROMPT = `You are "Hunter Copilot", the 24/7 dedicated platform support and instant FAQ assistant for Lead Hunter Club (leadhunterclub.com).
Your purpose is to answer member questions regarding the platform, credit costs, plans, exclusivity, lead sources, and support escalation.
Format your responses with clean, concise markdown, bullet points, and an encouraging tone.

### Core Official FAQ & Guidelines (STRICT ACCURACY):
1. **How do credits work?**:
   You receive 1,000 Wolf Coins monthly with your ₹999 plan. Use coins to unlock lead details (Email = 10 coins, Phone = 12 coins, Both = 15 coins). If you run out, buy top-ups starting at ₹199. Top-up coins never expire.

2. **How many leads can we get in a month?**:
   Between 65 to 100+ leads per month using your base monthly credits. The exact number depends on whether you unlock email-only or full phone contacts. Top up anytime if you need more.

3. **Do you close clients for us?**:
   No. We provide verified client contacts and project details. You pitch and close them directly, keeping 100% of what you earn—we take 0% commission.

4. **What is the source of these leads?**:
   We track live hiring posts, founder requests, and project briefs across LinkedIn, Twitter/X, Reddit, and private networks.

5. **Exclusive Claim Policy (Zero Spam)**:
   - When a member reveals a lead, that lead is locked exclusively for them.
   - Other members cannot claim or reveal the same lead. This protects your outreach from competing with dozens of agencies.

6. **Refunds on Invalid Contacts**:
   - If a revealed email bounces or is demonstrably invalid, members can request a 100% credit refund by opening a quick ticket on /support with the Lead ID.

7. **Human Support Escalation**:
   - If the user has a billing issue, technical glitch, or needs human assistance, direct them to /support to click "New Ticket". Admins respond promptly.

Keep responses under 150 words whenever possible. Focus directly on the user's question.`

function getDirectFaqAnswer(query: string): string | null {
  const q = query.trim().toLowerCase()

  // 1) How do credits work?
  if (
    q === 'how do credits work?' ||
    q === 'how do credits work' ||
    q === 'how does credits work?' ||
    q === 'how does credits work' ||
    q === 'how do wolf coins work?' ||
    q === 'how do wolf coins work' ||
    q === 'how credits work'
  ) {
    return `You receive 1,000 Wolf Coins monthly with your ₹999 plan. Use coins to unlock lead details (Email = 10 coins, Phone = 12 coins, Both = 15 coins). If you run out, buy top-ups starting at ₹199. Top-up coins never expire.`
  }

  // 2) How many leads can we get in a month?
  if (
    q === 'how many leads can we get in a month?' ||
    q === 'how many leads can we get in a month' ||
    q === 'how many leads can we get?' ||
    q === 'how many leads can we get' ||
    q === 'how many leads in a month?' ||
    q === 'how many leads in a month' ||
    q === 'how many leads per month?' ||
    q === 'how many leads per month'
  ) {
    return `Between 65 to 100+ leads per month using your base monthly credits. The exact number depends on whether you unlock email-only or full phone contacts. Top up anytime if you need more.`
  }

  // 3) Do you close clients for us?
  if (
    q === 'do you close clients for us?' ||
    q === 'do you close clients for us' ||
    q === 'do you close client for us?' ||
    q === 'do you close client for us' ||
    q === 'do you close clients?' ||
    q === 'do you close clients' ||
    q === 'will you close clients for us?' ||
    q === 'will you close clients for us'
  ) {
    return `No. We provide verified client contacts and project details. You pitch and close them directly, keeping 100% of what you earn—we take 0% commission.`
  }

  // 4) What is the source of these leads?
  if (
    q === 'what is the source of these leads?' ||
    q === 'what is the source of these leads' ||
    q === 'what is the source of the leads?' ||
    q === 'what is the source of the leads' ||
    q === 'what is the source of leads?' ||
    q === 'what is the source of leads' ||
    q === 'where do these leads come from?' ||
    q === 'where do these leads come from'
  ) {
    return `We track live hiring posts, founder requests, and project briefs across LinkedIn, Twitter/X, Reddit, and private networks.`
  }

  return null
}

function getDeterministicFaqAnswer(query: string): string {
  const direct = getDirectFaqAnswer(query)
  if (direct) return direct

  const q = query.toLowerCase()

  // 3) Do you close clients for us?
  if (
    q.includes('close client') ||
    q.includes('close for us') ||
    q.includes('pitch for us') ||
    q.includes('commission') ||
    q.includes('do you close') ||
    q.includes('book client')
  ) {
    return `**Do You Close Clients For Us?**
No. We provide verified client contacts and project details. You pitch and close them directly, keeping 100% of what you earn—we take 0% commission.`
  }

  // 4) What is the source of these leads?
  if (
    q.includes('source') ||
    q.includes('where do you get') ||
    q.includes('where are leads from') ||
    q.includes('how do you find leads') ||
    q.includes('where do leads come from')
  ) {
    return `**Source of Leads:**
We track live hiring posts, founder requests, and project briefs across LinkedIn, Twitter/X, Reddit, and private networks.`
  }

  // 2) How many leads can we get in a month?
  if (
    q.includes('how many lead') ||
    q.includes('leads can we get') ||
    q.includes('leads in a month') ||
    q.includes('leads per month') ||
    q.includes('lead limit') ||
    q.includes('how many client')
  ) {
    return `**How Many Leads You Can Get in a Month:**
Between 65 to 100+ leads per month using your base monthly credits. The exact number depends on whether you unlock email-only or full phone contacts. Top up anytime if you need more.`
  }

  // 1) How do credits work?
  if (
    q.includes('credit') ||
    q.includes('coin') ||
    q.includes('wolf coin') ||
    q.includes('how do credits work') ||
    q.includes('cost') ||
    q.includes('override') ||
    q.includes('price') ||
    q.includes('unlock')
  ) {
    return `**How Credits Work:**
You receive 1,000 Wolf Coins monthly with your ₹999 plan. Use coins to unlock lead details (Email = 10 coins, Phone = 12 coins, Both = 15 coins). If you run out, buy top-ups starting at ₹199. Top-up coins never expire.`
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
• **Monthly Plan**: ₹999/month comes with 1,000 Wolf Coins renewed each cycle.
• **Top-ups**: If you run out of credits mid-month, you can buy instant credit packs starting at ₹199 (never expire).
• **Upgrade / Downgrade**: You can switch plans at [/pricing](/pricing) or manage cancellation in [/settings](/settings).`
  }

  if (q.includes('support') || q.includes('human') || q.includes('ticket') || q.includes('admin') || q.includes('help') || q.includes('contact support')) {
    return `**Contact Human Support:**
• Our admin team is ready to help with account, billing, or technical queries.
• Visit [/support](/support) and click **"New Ticket"** to open a direct support thread. We actively monitor and resolve tickets!`
  }

  if (q.includes('niche') || q.includes('filter') || q.includes('new lead') || q.includes('drop') || q.includes('when')) {
    return `**Lead Drops & Niches:**
• Leads are gathered from real-time client posts across LinkedIn, Twitter/X, Reddit, and private networks.
• New qualified leads are approved and published multiple times throughout the day.
• Use the niche filters on [/leads](/leads) to find exact-match opportunities.`
  }

  return `**Hunter Copilot (24/7 Support):**
I'm here to help you navigate Lead Hunter Club smoothly! Here are the most common questions members ask:

• **How do credits work?**
  You receive 1,000 Wolf Coins monthly with your ₹999 plan. Use coins to unlock lead details (Email = 10 coins, Phone = 12 coins, Both = 15 coins). If you run out, buy top-ups starting at ₹199. Top-up coins never expire.

• **How many leads can we get in a month?**
  Between 65 to 100+ leads per month using your base monthly credits. The exact number depends on whether you unlock email-only or full phone contacts. Top up anytime if you need more.

• **Do you close clients for us?**
  No. We provide verified client contacts and project details. You pitch and close them directly, keeping 100% of what you earn—we take 0% commission.

• **What is the source of these leads?**
  We track live hiring posts, founder requests, and project briefs across LinkedIn, Twitter/X, Reddit, and private networks.

What can I clarify for you?`
}

async function callLlm(messages: ChatMessage[]): Promise<string> {
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || ''

  // Fast direct match for the 4 core FAQs (0ms latency, exact canonical answer)
  const directFaq = getDirectFaqAnswer(lastUserMsg)
  if (directFaq) return directFaq

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
