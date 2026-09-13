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
    const intel = (post.intelligence || '').toLowerCase();
    const title = (post.title || '').toLowerCase();
    const text = `${kw} ${c} ${title} ${intel}`;

    // 1. Web Development
    const isWeb =
        /\b(website|web app|web application|web dev|web developer|web development|frontend|front-end|backend|back-end|fullstack|full-stack|next\.?js|react|react\.?js|vue|angular|node|node\.?js|express|django|flask|laravel|php|wordpress|woocommerce|shopify|webflow|wix|html|css|javascript|typescript|tailwind|mongodb|postgres|postgresql|mysql|prisma|rest api|graphql)\b/i.test(text);

    // 2. Mobile Development (strictly mobile, avoiding false positives on "web app" or "ios" in "portfolios")
    const isMobile =
        /\b(mobile app|ios app|android app|react native|flutter|swiftui|swift developer|kotlin|xcode)\b/i.test(text) ||
        /\b(ios developer|android developer|mobile developer|flutter developer)\b/i.test(text) ||
        (/\b(ios|android)\b/i.test(text) && /\b(app|mobile|sdk|play store|app store)\b/i.test(text));

    // 3. Paid Ads & Performance Marketing
    const isMarketing =
        /\b(performance marketing|paid ads|facebook ads|meta ads|google ads|media buyer|digital marketing|ad campaign|ppc|sem|roas|social media agency|social media marketing)\b/i.test(text);

    // 4. UI/UX Design
    const isUiUx =
        /\b(ui\/ux|ui ux|figma|product design|landing page design|web design|ux design|ui design|wireframe|wireframing|prototype|prototyping)\b/i.test(text);

    // 5. Branding & Graphic Design
    const isBranding =
        /\b(branding|brand identity|graphic design|graphic designer|logo design|magazine design|illustrator|print design|publishing studio)\b/i.test(text);

    // 6. SEO & Organic Growth
    const isSeo =
        /\b(seo|search engine optimization|organic traffic|backlinks|technical seo|link building)\b/i.test(text);

    // 7. Video Production & Editing
    const isVideo =
        /\b(video edit|video editor|video editing|motion graphics|reels editor|animator|after effects|premiere pro|video production)\b/i.test(text);

    // 8. Content & Copywriting
    const isCopy =
        /\b(copywriter|copywriting|content writer|content writing|technical writer|newsletter writer|editorial content|ghostwriter)\b/i.test(text);

    // 9. AI & Automation
    const isAi =
        /\b(ai agent|automation|n8n|zapier|make\.com|chatbot|langchain|rag|workflow automation|ai developer)\b/i.test(text);

    if (isMarketing && !isWeb && !isMobile) return 'Paid Ads & Marketing';
    if (isWeb && !isMobile) return 'Web Development';
    if (isMobile && !isWeb) return 'Mobile Development';
    if (isWeb && isMobile) {
        if (/\b(web app|website|next\.?js|react|frontend|backend)\b/i.test(text) && !/\b(ios app|android app)\b/i.test(text)) {
            return 'Web Development';
        }
        return 'Mobile Development';
    }
    if (isUiUx) return 'UI/UX Design';
    if (isBranding) return 'Branding & Design';
    if (isMarketing) return 'Paid Ads & Marketing';
    if (isVideo) return 'Video Production & Editing';
    if (isCopy) return 'Content & Copywriting';
    if (isSeo) return 'SEO & Organic Growth';
    if (isAi) return 'AI & Automation';

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
