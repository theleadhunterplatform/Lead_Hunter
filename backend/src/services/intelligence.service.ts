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
    const rawModel = config.openRouter.intelModel || 'google/gemini-2.0-flash-001';
    const modelsToTry = [rawModel];
    for (const m of ['google/gemini-2.0-flash-001', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-flash-1.5']) {
        if (!modelsToTry.includes(m)) modelsToTry.push(m);
    }

    let lastErr: any = null;
    for (const model of modelsToTry) {
        try {
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model,
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
                    timeout: 45000,
                },
            );
            const content = response.data?.choices?.[0]?.message?.content;
            if (content) return content;
        } catch (err: any) {
            lastErr = err;
            // Only retry if model not found or forbidden
            const status = err.response?.status;
            if (status !== 404 && status !== 400 && status !== 403) throw err;
        }
    }
    throw lastErr || new Error('No content returned from OpenRouter');
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
    const rawModel = config.groq.intelModel || 'llama-3.1-8b-instant';
    const modelsToTry = [rawModel];
    for (const m of ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768']) {
        if (!modelsToTry.includes(m)) modelsToTry.push(m);
    }

    let lastErr: any = null;
    for (const model of modelsToTry) {
        try {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model,
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
                    timeout: 45000,
                },
            );
            const content = response.data?.choices?.[0]?.message?.content;
            if (content) return content;
        } catch (err: any) {
            lastErr = err;
            const status = err.response?.status;
            if (status !== 404 && status !== 400 && status !== 403) throw err;
        }
    }
    throw lastErr || new Error('No content returned from Groq');
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const rawModel = (config.gemini.intelModel || 'gemini-2.0-flash').replace(/^models\//, '');
    const modelsToTry = [rawModel];
    for (const m of ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash']) {
        if (!modelsToTry.includes(m)) modelsToTry.push(m);
    }

    let lastErr: any = null;
    for (const model of modelsToTry) {
        try {
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
                    timeout: 45000,
                },
            );
            const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) return content;
        } catch (err: any) {
            lastErr = err;
            const status = err.response?.status;
            if (status !== 404 && status !== 400) throw err;
        }
    }
    throw lastErr || new Error('No content returned from Gemini');
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

function extractTitleFromIntelligence(content: string): string | null {
    if (!content) return null;
    const match = content.match(/#*\s*(?:🔥)?\s*Lead Intelligence:\s*([^\n\r]+)/i);
    if (match && match[1]) {
        return match[1].replace(/^[#*_\s]+|[#*_\s]+$/g, '').trim();
    }
    return null;
}

/**
 * Generates strategic lead intelligence using a multi-provider fallback chain.
 * Order: OpenRouter → Groq → Gemini (direct)
 */
export const generateLeadIntelligence = async (post: any) => {
    console.log(`🧠 [Intelligence] Generating strategic report for post: ${post.post_id} (${post.platform})`);

    const prompt = buildPrompt(post);

    const { content: intelligenceContent, provider } = await generateWithFallback(prompt);

    console.log(`✅ [Intelligence] Report generated via ${provider} for post: ${post.post_id}`);

    const extractedTitle = extractTitleFromIntelligence(intelligenceContent);

    // Store in LeadIntelligence table
    const intelligence = await LeadIntelligence.findOneAndUpdate(
        { post_id: post._id },
        { content: intelligenceContent },
        { upsert: true, new: true },
    );

    // Sync to LeadPost for list-view access without joins
    const updateData: any = { intelligence: intelligenceContent };
    if (extractedTitle) {
        updateData.title = extractedTitle;
    }
    await LeadPost.updateOne(
        { _id: post._id || post.id },
        updateData,
    );

    console.log(`✅ [Intelligence] Report saved for post: ${post.post_id}${extractedTitle ? ` (Title: "${extractedTitle}")` : ''}`);
    return intelligence;
};
