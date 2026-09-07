import axios from 'axios';
import config from '../config';
import LeadIntelligence from '../models/lead-intelligence.model';
import LeadPost from '../models/lead-post.model';
import { getSetting } from './setting.service';

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(post: any): string {
    return `
Analyze the following lead from ${post.platform} and generate a "Lead Intelligence" report in Markdown format.

Post Content:
"${post.content}"

Author: ${post.author?.name || 'Unknown'} (@${post.author?.handle || 'unknown'})
Platform: ${post.platform}
Keyword/Context: ${post.keyword}
Engagement: ${post.engagement?.likes || 0} likes, ${post.engagement?.comments || 0} comments

Format the output exactly like this example structure, using professional and high-level strategic language:

# 🔥 Lead Intelligence: [Brief Catchy Title - e.g. "Luxury Website Rebuild"]

### 🧠 One-Liner
[Single sentence summary of the lead and their core need]

---

## 🧩 Context You Might Miss
* [Bullet points about the company/person if identifiable, or industry context/nuance]

---

## 🔥 The Real X-Factor
* [What makes this lead unique, high value, or particularly worth chasing]

---

## 🎯 What They Actually Want
* [The underlying strategic need behind the surface-level request]

---

## 📊 Lead Breakdown
* **Intent:** [Low/Medium/High]
* **Urgency:** [Low/Medium/High]
* **Close Window:** [Estimated timeframe, e.g. 5-10 days]
* **Competition:** [Low/Medium/High]

---

## ⚠️ Red Flags
* [Possible friction points, budget concerns, or technical hurdles]

---

## ✅ How to Win
* [Strategic advice on the exact positioning to use in outreach]

---

## 🧠 Angle
> [The best psychological/strategic headline or core message to use]

---

## 🏁 Verdict
**Lead Score: [X]/10**
`;
}

const SYSTEM_PROMPT =
    'You are a high-level sales strategist and lead generation expert for a premium digital agency. Your goal is to analyze social media leads and provide deep strategic intelligence to help close high-ticket deals.';

// ─── Provider implementations ─────────────────────────────────────────────────

async function callOpenRouter(prompt: string, apiKey: string): Promise<string> {
    const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model: config.openRouter.intelModel,
            max_tokens: config.openRouter.intelMaxTokens,
            temperature: 0.7,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://leadhunterclub.com',
                'X-Title': 'Lead Hunter Club',
                'Content-Type': 'application/json',
            },
            timeout: 60000,
        },
    );
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content returned from OpenRouter');
    return content;
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
    const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            model: config.groq.intelModel,
            max_tokens: 2048,
            temperature: 0.7,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 60000,
        },
    );
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content returned from Groq');
    return content;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const model = (config.gemini.intelModel || 'gemini-1.5-flash').replace(/^models\//, '');
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            contents: [
                {
                    parts: [
                        { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
                    ],
                },
            ],
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
            },
        },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000,
        },
    );
    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('No content returned from Gemini');
    return content;
}

// ─── Fallback chain ───────────────────────────────────────────────────────────

interface ProviderResult {
    content: string;
    provider: string;
}

async function generateWithFallback(prompt: string): Promise<ProviderResult> {
    const errors: string[] = [];

    // 1. OpenRouter (primary)
    const dbKey = await getSetting('openrouter_api_key').catch(() => null);
    const openRouterKey = (dbKey as string) || config.openRouter.apiKey;
    if (openRouterKey?.trim()) {
        try {
            const content = await callOpenRouter(prompt, openRouterKey);
            return { content, provider: 'openrouter' };
        } catch (err: any) {
            const msg = err.response?.data?.error?.message || err.message || 'Unknown error';
            console.warn(`[Intelligence] OpenRouter failed: ${msg}`);
            errors.push(`OpenRouter: ${msg}`);
        }
    } else {
        errors.push('OpenRouter: API key not configured');
    }

    // 2. Groq (first fallback)
    if (config.groq.apiKey?.trim()) {
        try {
            const content = await callGroq(prompt, config.groq.apiKey);
            return { content, provider: 'groq' };
        } catch (err: any) {
            const msg = err.response?.data?.error?.message || err.message || 'Unknown error';
            console.warn(`[Intelligence] Groq failed: ${msg}`);
            errors.push(`Groq: ${msg}`);
        }
    } else {
        errors.push('Groq: API key not configured');
    }

    // 3. Gemini direct (second fallback)
    if (config.gemini.apiKey?.trim()) {
        try {
            const content = await callGemini(prompt, config.gemini.apiKey);
            return { content, provider: 'gemini' };
        } catch (err: any) {
            const msg = err.response?.data?.error?.message || err.message || 'Unknown error';
            console.warn(`[Intelligence] Gemini failed: ${msg}`);
            errors.push(`Gemini: ${msg}`);
        }
    } else {
        errors.push('Gemini: API key not configured');
    }

    throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generates strategic lead intelligence using a multi-provider fallback chain.
 * Order: OpenRouter → Groq → Gemini (direct)
 */
export const generateLeadIntelligence = async (post: any) => {
    console.log(`🧠 [Intelligence] Generating strategic report for post: ${post.post_id} (${post.platform})`);

    const prompt = buildPrompt(post);

    const { content: intelligenceContent, provider } = await generateWithFallback(prompt);

    console.log(`✅ [Intelligence] Report generated via ${provider} for post: ${post.post_id}`);

    // Store in LeadIntelligence table
    const intelligence = await LeadIntelligence.findOneAndUpdate(
        { post_id: post._id },
        { content: intelligenceContent },
        { upsert: true, new: true },
    );

    // Sync to LeadPost for list-view access without joins
    await LeadPost.updateOne(
        { _id: post._id || post.id },
        { intelligence: intelligenceContent },
    );

    console.log(`✅ [Intelligence] Report saved for post: ${post.post_id}`);
    return intelligence;
};
