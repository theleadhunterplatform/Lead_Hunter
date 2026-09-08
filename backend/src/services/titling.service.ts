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
    const rawModel = config.openRouter.intelModel || 'google/gemini-2.0-flash-001';
    const modelsToTry = [rawModel];
    for (const m of ['google/gemini-2.0-flash-001', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-flash-1.5']) {
        if (!modelsToTry.includes(m)) modelsToTry.push(m);
    }

    let lastErr: any = null;
    for (const model of modelsToTry) {
        try {
            const res = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model,
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
            if (content) return content;
        } catch (err: any) {
            lastErr = err;
            const status = err.response?.status;
            if (status !== 404 && status !== 400 && status !== 403) throw err;
        }
    }
    throw lastErr || new Error('No content from OpenRouter');
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
            const res = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model,
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
            if (content) return content;
        } catch (err: any) {
            lastErr = err;
            const status = err.response?.status;
            if (status !== 404 && status !== 400 && status !== 403) throw err;
        }
    }
    throw lastErr || new Error('No content from Groq');
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
            if (content) return content;
        } catch (err: any) {
            lastErr = err;
            const status = err.response?.status;
            if (status !== 404 && status !== 400) throw err;
        }
    }
    throw lastErr || new Error('No content from Gemini');
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
            const msg = err.response?.data?.error?.message || err.message;
            errors.push(`OpenRouter: ${msg}`);
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
            const msg = err.response?.data?.error?.message || err.message;
            errors.push(`Groq: ${msg}`);
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
            const msg = err.response?.data?.error?.message || err.message;
            errors.push(`Gemini: ${msg}`);
        }
    }

    throw new Error(`All titling providers failed: ${errors.join(' | ')}`);
}

export function inferNiche(post: any): string {
    const kw = (post.keyword || '').toLowerCase().replace(/^watchlist:/, '');
    const c = (post.content || '').toLowerCase();
    const text = `${kw} ${c}`;

    if (text.includes('nextjs') || text.includes('react') || text.includes('frontend') || text.includes('fullstack') || text.includes('web dev') || text.includes('web development') || text.includes('backend') || text.includes('node') || text.includes('python') || text.includes('wordpress') || text.includes('shopify') || text.includes('webflow')) {
        return 'Web Development';
    }
    if (text.includes('mobile app') || text.includes('ios') || text.includes('android') || text.includes('flutter') || text.includes('react native')) {
        return 'Mobile Development';
    }
    if (text.includes('ui/ux') || text.includes('figma') || text.includes('product design') || text.includes('landing page design') || text.includes('web design') || text.includes('ux design') || text.includes('ui design')) {
        return 'UI/UX Design';
    }
    if (text.includes('graphic design') || text.includes('branding') || text.includes('logo') || text.includes('brand identity') || text.includes('illustrator')) {
        return 'Branding & Design';
    }
    if (text.includes('seo') || text.includes('organic search') || text.includes('backlink') || text.includes('search engine')) {
        return 'SEO & Organic Growth';
    }
    if (text.includes('paid ads') || text.includes('facebook ads') || text.includes('google ads') || text.includes('meta ads') || text.includes('performance marketing') || text.includes('media buyer')) {
        return 'Paid Ads & Marketing';
    }
    if (text.includes('copywriting') || text.includes('copywriter') || text.includes('content writer') || text.includes('technical writing') || text.includes('blog writing') || text.includes('newsletter')) {
        return 'Content & Copywriting';
    }
    if (text.includes('video editor') || text.includes('video editing') || text.includes('youtube editor') || text.includes('reels') || text.includes('motion graphics') || text.includes('animator')) {
        return 'Video Production & Editing';
    }
    if (text.includes('cold email') || text.includes('lead gen') || text.includes('lead generation') || text.includes('outreach') || text.includes('sales rep') || text.includes('bdr') || text.includes('sdr') || text.includes('appointment setting')) {
        return 'Sales & Lead Gen';
    }
    if (text.includes('ai agent') || text.includes('automation') || text.includes('n8n') || text.includes('zapier') || text.includes('make.com') || text.includes('chatbot') || text.includes('llm') || text.includes('workflow automation')) {
        return 'AI & Automation';
    }
    return 'Consulting & Strategy';
}

export async function applyLeadTitle(postId: string): Promise<void> {
    const post = await LeadPost.findById(postId);
    if (!post) throw new Error(`Post not found: ${postId}`);

    const existingTitle = (post as any).title;
    const existingNiche = (post as any).niche;
    if (existingTitle && existingNiche) return;

    const title = existingTitle || await generateLeadTitle(post);
    const niche = existingNiche || inferNiche(post);

    await LeadPost.updateOne(
        { _id: post._id || post.id },
        { title, niche },
    );
}
