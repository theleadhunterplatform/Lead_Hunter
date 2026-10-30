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
    for (const m of ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']) {
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
    const validDbKey = typeof dbKey === 'string' && !dbKey.includes('...') && dbKey.trim().length > 20 ? dbKey.trim() : null;
    const openRouterKey = validDbKey || config.openRouter.apiKey;
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
    const kw = (post.keyword || '').normalize('NFKD').toLowerCase().replace(/^watchlist:[^\s]+\s*/i, '');
    const c = (post.content || '').normalize('NFKD').toLowerCase();
    const intel = (post.intelligence || '').normalize('NFKD').toLowerCase();
    const title = (post.title || '').normalize('NFKD').toLowerCase();

    // 1. Check if AI Intelligence has explicit niche
    const aiNicheMatch = intel.match(/###\s*(?:🎯)?\s*niche\s*\n+([^\n#\r]+)/i);
    const candidate = aiNicheMatch && aiNicheMatch[1] ? aiNicheMatch[1].replace(/^[#*_\s]+|[#*_\s]+$/g, '').trim().toLowerCase() : '';

    const VALID_NICHES = [
        'Web Development',
        'Mobile Development',
        'UI/UX Design',
        'Branding & Design',
        'SEO & Organic Growth',
        'Paid Ads & Marketing',
        'Content & Copywriting',
        'Video Production & Editing',
        'AI & Automation',
        'Sales & Lead Gen',
        'Consulting & Strategy',
    ];

    if (candidate) {
        const found = VALID_NICHES.find((v) => v.toLowerCase() === candidate || candidate.includes(v.toLowerCase()));
        if (found) return found;
    }

    // 2. High-precision cluster classification on candidate + intel + content + title (actual post intent beats scraper keyword!)
    const primaryText = `${candidate} ${intel} ${c} ${title}`.trim();

    // Paid Ads & Marketing (High Priority - includes social media management & creative agencies)
    if (/\b(performance marketing|paid ads|facebook ads|fb ads|meta ads|google ads|media buyer|ppc specialist|ppc agency|roas|ad campaigns?|social media marketing|social media management|social media manager|social media agency|social media|smm|d2c marketing|growth marketing|digital marketing|digital marketer|marketing agency|creative agency|creative marketing agency|brand activation|event activation|influencer (strategist|marketing|campaign|outreach)|creator campaign|creators for an upcoming|brand campaign|ugc agency)\b/i.test(primaryText)) {
        return 'Paid Ads & Marketing';
    }

    // UI/UX & Product Design
    if (/\b(ui\/ux|ui ux|ux\/ui|figma|product design(er| intern)?|ux design(er| intern)?|ui design(er| intern)?|wirefram(e|ing)|mockups?|user experience|user interface|app design(er)?|(web|website|shopify|webflow) design(er|ing)?|website redesign|landing page design(er)?|landing page redesign|redesign (our|the|a) (website|app|platform)|design system|prototyp(e|ing))\b/i.test(primaryText)) {
        return 'UI/UX Design';
    }

    // SEO & Organic Growth
    if (/\b(seo specialist|seo expert|seo agency|technical seo|on-page seo|off-page seo|backlinks?|search engine optimization|google rank(ing)?|rank on google|organic traffic|serp|link building|geo specialist|ahrefs|semrush|search console)\b/i.test(primaryText)) {
        return 'SEO & Organic Growth';
    }

    // Video Production & Editing (includes content production, reels, product shoots, photography)
    if (/\b(video edit(or|ing)?|motion graphics|reels edit(or|ing)?|reels|tiktok edit(or|ing)?|youtube edit(or|ing)?|animator|2d animat(or|ion)|3d animat(or|ion)|character animat(or|ion)|motion designer|premiere pro|after effects|video production|content production|videographer|video creator|ugc video|video thumbnail|thumbnail designer|product shoots?|photography|photographer|photoshoots?|videography|creative shoots?|scroll-stopping content)\b/i.test(primaryText)) {
        return 'Video Production & Editing';
    }

    // Branding & Graphic Design
    if (/\b(brand identity|branding agency|logo design(er)?|graphic design(er)?|packaging design|brand guidelines|visual identity|illustrat(or|ion)|brochure design|creative director|brand experience|creative agency|aesthetic photography|product photography)\b/i.test(primaryText)) {
        return 'Branding & Design';
    }

    // Content & Copywriting
    if (/\b(copywrit(er|ing)|content writ(er|ing)|technical writ(er|ing)|newsletter writ(er|ing)|ghostwrit(er|ing)|scriptwrit(er|ing)|blog writ(er|ing)|email copy(writer)?)\b/i.test(primaryText)) {
        return 'Content & Copywriting';
    }

    // Mobile Development
    if (/\b(mobile app( developer)?|ios (app|developer)|android (app|apk|developer)|apk developer|react native|flutter( developer)?|swiftui?|swift developer|kotlin developer|xcode|pos development|pos application)\b/i.test(primaryText)) {
        return 'Mobile Development';
    }

    // AI & Automation
    if (/\b(ai agent|workflow automation|n8n|zapier|make\.com|chatbot|langchain|rag|ai developer|ai automation|prompt engineer|fine-tuning llm|openai api|ai implementation|ai partners?|ai work|zoho|hubspot|crm implementation|data engineer(ing)?|scraper|scraping|data pipeline)\b/i.test(primaryText)) {
        return 'AI & Automation';
    }

    // Sales & Lead Generation
    if (/\b(lead gen(eration)?|cold outreach|appointment setter|cold email|b2b sales|b2b leads|sales rep|sdr|bdr|business development rep|lead list|apollo\.io|cold calling|telemarketing|sales executive)\b/i.test(primaryText)) {
        return 'Sales & Lead Gen';
    }

    // Web Development
    if (
        /\b(web dev(elop(er|ers|ment)?)?|website dev(elop(er|ers|ment)?)?|frontend( developer| developers)?|front-end|backend( developer| developers)?|back-end|fullstack|full-stack|next\.?js|react\.?js|react developer|vue|angular|node\.?js|express\.?js|django|flask|laravel|php developer|wordpress|elementor|divi|divibuilder|shopify|webflow|wix|squarespace|framer|html\/css|javascript developer|typescript developer|tailwind|prisma|graphql|rest api|mern|software engineer(s)?|software developer(s)?|salesforce developer|web accessibility|ontwikkelaar)\b/i.test(primaryText) ||
        (/\b(develop(er|ers|ing)?|devs?|code|coding|build|program(mer|ming)?)\b/i.test(primaryText) && /\b(website|web app|platform|portal|site|system|application)\b/i.test(primaryText))
    ) {
        return 'Web Development';
    }

    // Consulting & Strategy
    if (/\b(fractional cmo|fractional cto|business consultant|strategy consultant|advisor|accountant|accounting|bookkeeper|bookkeeping|tax filing|crm system|advisory)\b/i.test(primaryText)) {
        return 'Consulting & Strategy';
    }

    // 3. Fallback to scraper keyword
    if (kw) {
        if (/\b(performance marketing|paid ads|facebook ads|google ads|meta ads|ppc|marketing|advertising)\b/i.test(kw)) return 'Paid Ads & Marketing';
        if (/\b(ui\/ux|design|figma)\b/i.test(kw)) return 'UI/UX Design';
        if (/\b(seo)\b/i.test(kw)) return 'SEO & Organic Growth';
        if (/\b(video)\b/i.test(kw)) return 'Video Production & Editing';
        if (/\b(branding|logo)\b/i.test(kw)) return 'Branding & Design';
        if (/\b(content|copywriting|writer)\b/i.test(kw)) return 'Content & Copywriting';
        if (/\b(mobile|ios|android|flutter|react native)\b/i.test(kw)) return 'Mobile Development';
        if (/\b(ai|automation|agent)\b/i.test(kw)) return 'AI & Automation';
        if (/\b(sales|lead gen|outreach)\b/i.test(kw)) return 'Sales & Lead Gen';
        if (/\b(web|frontend|backend|developer|dev)\b/i.test(kw)) return 'Web Development';
        if (/\b(consulting|strategy)\b/i.test(kw)) return 'Consulting & Strategy';
    }

    return 'General';
}

export async function applyLeadTitle(postId: string): Promise<void> {
    const post = await LeadPost.findById(postId);
    if (!post) throw new Error(`Post not found: ${postId}`);

    const existingTitle = (post as any).title;
    const existingNiche = (post as any).niche;

    const title = existingTitle || await generateLeadTitle(post);
    const inferred = inferNiche(post);
    const niche = inferred !== 'General' ? inferred : (existingNiche || 'General');

    await LeadPost.updateOne(
        { _id: post._id || post.id },
        { title, niche },
    );
}
