import axios from 'axios';
import config from '../config';
import LeadPost from '../models/lead-post.model';
import { getSetting } from './setting.service';

const SYSTEM_PROMPT =
    'You are a concise lead analyst. Return ONLY a 4-6 word title summarizing the lead\'s core need. No punctuation at the end. No explanation. Just the title.';

function buildTitlePrompt(post: any): string {
    return `Read this post and return ONLY a 4-6 word title summarizing what the person needs.

Post: "${post.content?.slice(0, 500) || ''}"
Platform: ${post.platform}
Keyword: ${post.keyword}

Return ONLY the title, nothing else.`;
}

async function callOpenRouter(prompt: string, apiKey: string): Promise<string> {
    const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model: config.openRouter.intelModel,
            max_tokens: 30,
            temperature: 0.3,
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
            timeout: 20000,
        },
    );
    const content = res.data?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('No content from OpenRouter');
    return content;
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
    const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            model: config.groq.intelModel,
            max_tokens: 30,
            temperature: 0.3,
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
            timeout: 20000,
        },
    );
    const content = res.data?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('No content from Groq');
    return content;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const model = config.gemini.intelModel;
    const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
            generationConfig: { maxOutputTokens: 30, temperature: 0.3 },
        },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000,
        },
    );
    const content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!content) throw new Error('No content from Gemini');
    return content;
}

function cleanTitle(raw: string): string {
    // Strip quotes, markdown, trailing punctuation
    return raw
        .replace(/^["'`*#]+|["'`*#]+$/g, '')
        .replace(/[.!?]+$/, '')
        .trim()
        .slice(0, 80); // hard cap
}

export async function generateLeadTitle(post: any): Promise<string> {
    const prompt = buildTitlePrompt(post);
    const errors: string[] = [];

    // 1. OpenRouter
    const dbKey = await getSetting('openrouter_api_key').catch(() => null);
    const openRouterKey = (dbKey as string) || config.openRouter.apiKey;
    if (openRouterKey?.trim()) {
        try {
            const raw = await callOpenRouter(prompt, openRouterKey);
            const title = cleanTitle(raw);
            if (title) {
                console.log(`🏷️  [Titling] OpenRouter → "${title}" for post ${post.post_id}`);
                return title;
            }
        } catch (err: any) {
            errors.push(`OpenRouter: ${err.message}`);
        }
    }

    // 2. Groq
    if (config.groq.apiKey?.trim()) {
        try {
            const raw = await callGroq(prompt, config.groq.apiKey);
            const title = cleanTitle(raw);
            if (title) {
                console.log(`🏷️  [Titling] Groq → "${title}" for post ${post.post_id}`);
                return title;
            }
        } catch (err: any) {
            errors.push(`Groq: ${err.message}`);
        }
    }

    // 3. Gemini
    if (config.gemini.apiKey?.trim()) {
        try {
            const raw = await callGemini(prompt, config.gemini.apiKey);
            const title = cleanTitle(raw);
            if (title) {
                console.log(`🏷️  [Titling] Gemini → "${title}" for post ${post.post_id}`);
                return title;
            }
        } catch (err: any) {
            errors.push(`Gemini: ${err.message}`);
        }
    }

    throw new Error(`All titling providers failed: ${errors.join(' | ')}`);
}

export async function applyLeadTitle(postId: string): Promise<void> {
    const post = await LeadPost.findById(postId);
    if (!post) throw new Error(`Post not found: ${postId}`);

    // Skip if already titled
    if ((post as any).title) return;

    const title = await generateLeadTitle(post);

    await LeadPost.updateOne(
        { _id: post._id || post.id },
        { title },
    );
}
