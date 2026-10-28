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

CRITICAL INSTRUCTIONS:
- Keep all sections concise, punchy, and direct. Avoid verbose conversational filler, repetitive paragraphs, or long multi-sentence explanations.
- NEVER include personal phone numbers, WhatsApp, personal emails, or private candidate info.
- In the Title, NEVER include specific company, brand, client, school, university, startup, or author names (e.g. do NOT write "KK Modi University Agency Needed" or "Sherringwood World School Web Developer", write "Digital Marketing Agency Partner Needed" or "Freelance Web Developer Needed Urgently").
- NEVER mention specific company, brand, client, school, university, startup, organization, or author names in the Title, One-Liner, 2-Line Summary, or 4-Line Summary. Always generalize using high-level industry terms (e.g. use "An educational institution", "A private university", "A fashion startup", "A B2B commodity firm", "An e-commerce brand", "A healthcare agency").
- Keep each bullet point to a single short, punchy sentence (under 15 words).

Format the output exactly like this example structure, using professional and high-level strategic language:

# 🔥 Lead Intelligence: [Brief Catchy Title under 7 words strictly without company/brand names - e.g. "Shopify Theme Store Rebuild"]

### 🎯 Niche
[Select EXACTLY ONE category from this list that best matches the core requirement: Web Development | Mobile Development | UI/UX Design | Branding & Design | SEO & Organic Growth | Paid Ads & Marketing | Content & Copywriting | Video Production & Editing | AI & Automation | Sales & Lead Gen | Consulting & Strategy]

### 🧠 One-Liner
[Single concise sentence (max 18 words) identifying the exact target role/specialist and core deliverable without filler or company names]

### 📋 2-Line Summary
[Two concise sentences: who is looking (generalized firm/client), what they need built, and key technical context.]

### 📝 4-Line Summary
[Four concise sentences: starts with the exact 2 sentences above, followed by 2 sentences detailing specific stack, timeline/budget, and engagement model.]

### 🏷️ Badges
[Comma-separated list of 3-5 tags matching Lead Hunter Club format: Include audience (Agency or Freelance), urgency if high (Hot Lead), location if mentioned (e.g.: Ahmedabad, Indore, Mumbai, Bangalore, Remote, International), plus 2-3 core skills/deliverables (e.g.: Agency, Hot Lead, Ahmedabad, React Native, MVP Build).]

---

## 🧩 Context You Might Miss
* [Concise bullet point identifying the buyer persona, company stage, or strategic context]
* [Concise bullet point noting unique project nuance or timeline]

---

## 🔥 The Real X-Factor
* [Concise bullet point on what makes this lead high-value or worth chasing]

---

## 🎯 What They Actually Want
* [Concise bullet point (1 short sentence, max 15 words) specifying primary technical or business deliverable]
* [Concise bullet point (1 short sentence, max 15 words) specifying key requirement or skill]

---

## 📊 Lead Breakdown
* **Intent:** [Low/Medium/High]
* **Urgency:** [Low/Medium/High]
* **Close Window:** [Estimated timeframe, e.g. 5-10 days]
* **Competition:** [Low/Medium/High]

---

## ⚠️ Red Flags
* [Concise bullet point on potential hurdle or budget constraint]

---

## ✅ How to Win
* [Concise bullet point on exact strategic positioning to close this deal]

---

## 🧠 Angle
> [One punchy headline or core hook message to use]

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
            if (status !== 404 && status !== 400 && status !== 402 && status !== 403) throw err;
        }
    }
    throw lastErr || new Error('No content returned from OpenRouter');
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
            if (status !== 404 && status !== 400 && status !== 402 && status !== 403) throw err;
        }
    }
    throw lastErr || new Error('No content returned from Groq');
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const rawModel = (config.gemini.intelModel || 'gemini-flash-lite-latest').replace(/^models\//, '');
    const modelsToTry = [rawModel];
    for (const m of ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-pro']) {
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
            if (status !== 404 && status !== 400 && status !== 503 && status !== 429) throw err;
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

    // 1. Gemini direct (fastest)
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

    // 2. OpenRouter (fallback)
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

    // 3. Groq (second fallback)
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

function extractNicheFromIntelligence(content: string): string | null {
    if (!content) return null;
    const match = content.match(/###\s*(?:🎯)?\s*Niche\s*\n+([^\n\r#]+)/i);
    const candidate = match && match[1] ? match[1].replace(/^[#*_\s]+|[#*_\s]+$/g, '').trim().toLowerCase() : '';

    if (candidate) {
        const found = VALID_NICHES.find((v) => v.toLowerCase() === candidate || candidate.includes(v.toLowerCase()));
        if (found) return found;
    }

    const textToScan = `${candidate} ${content}`.toLowerCase();

    // High-precision cluster classification
    if (/\b(performance marketing|paid ads|facebook ads|fb ads|meta ads|google ads|media buyer|ppc specialist|ppc agency|roas|ad campaigns?|social media marketing|social media management|social media manager|social media agency|social media|smm|d2c marketing|growth marketing|digital marketing|digital marketer|marketing agency|creative agency|creative marketing agency|brand activation|event activation|influencer (strategist|marketing|campaign|outreach)|creator campaign|creators for an upcoming|brand campaign|ugc agency)\b/i.test(textToScan)) {
        return 'Paid Ads & Marketing';
    }

    if (/\b(ui\/ux|ui ux|ux\/ui|figma|product design|ux design|ui design|wirefram|mockups?|user experience|user interface|website design|landing page design|redesign (our|the|a) (website|app)|design system|prototyp)\b/i.test(textToScan)) {
        return 'UI/UX Design';
    }

    if (/\b(seo specialist|seo expert|seo agency|technical seo|on-page seo|off-page seo|backlinks?|search engine optimization|google rank|rank on google|organic traffic|serp|link building|ahrefs|semrush)\b/i.test(textToScan)) {
        return 'SEO & Organic Growth';
    }

    if (/\b(video edit(or|ing)?|motion graphics|reels edit(or|ing)?|reels|tiktok edit(or|ing)?|youtube edit(or|ing)?|animator|2d animat(or|ion)|3d animat(or|ion)|character animat(or|ion)|motion designer|premiere pro|after effects|video production|content production|videographer|video creator|ugc video|video thumbnail|thumbnail designer|product shoots?|photography|photographer|photoshoots?|videography|creative shoots?|scroll-stopping content)\b/i.test(textToScan)) {
        return 'Video Production & Editing';
    }

    if (/\b(brand identity|branding agency|logo design|graphic design|packaging design|brand guidelines|visual identity|illustrat|creative director|creative agency|aesthetic photography|product photography)\b/i.test(textToScan)) {
        return 'Branding & Design';
    }

    if (/\b(copywrit|content writ|technical writ|newsletter writ|ghostwrit|scriptwrit|blog writ|email copy)\b/i.test(textToScan)) {
        return 'Content & Copywriting';
    }

    if (/\b(mobile app|ios (app|developer)|android (app|apk|developer)|apk developer|react native|flutter|swiftui?|swift developer|kotlin developer|xcode)\b/i.test(textToScan)) {
        return 'Mobile Development';
    }

    if (/\b(ai agent|workflow automation|n8n|zapier|make\.com|chatbot|langchain|rag|ai developer|prompt engineer|fine-tuning llm|openai api|crm implementation|scraper|scraping|data pipeline)\b/i.test(textToScan)) {
        return 'AI & Automation';
    }

    if (/\b(lead gen|cold outreach|appointment setter|cold email|b2b sales|b2b leads|sales rep|sdr|bdr|cold calling|telemarketing)\b/i.test(textToScan)) {
        return 'Sales & Lead Gen';
    }

    if (/\b(fractional cmo|fractional cto|business consultant|strategy consultant|advisor|accountant|accounting|bookkeeper|tax filing)\b/i.test(textToScan)) {
        return 'Consulting & Strategy';
    }

    if (/\b(web dev|website dev|frontend|backend|fullstack|next\.?js|react\.?js|vue|angular|node\.?js|express\.?js|django|flask|laravel|php developer|wordpress|elementor|divi|shopify|webflow|wix|framer|html\/css|javascript developer|typescript developer|tailwind|prisma|software engineer|software developer)\b/i.test(textToScan)) {
        return 'Web Development';
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
    const extractedNiche = extractNicheFromIntelligence(intelligenceContent);

    // Store in LeadIntelligence table
    const intelligence = await LeadIntelligence.findOneAndUpdate(
        { post_id: post.id || post._id },
        { content: intelligenceContent },
        { upsert: true, new: true },
    );

    // Sync to LeadPost for list-view access without joins
    const updateData: any = { intelligence: intelligenceContent };
    if (extractedTitle) {
        updateData.title = extractedTitle;
    }
    if (extractedNiche) {
        updateData.niche = extractedNiche;
    }
    await LeadPost.updateOne(
        { _id: post._id || post.id },
        updateData,
    );

    console.log(
        `✅ [Intelligence] Report saved for post: ${post.post_id}${extractedTitle ? ` (Title: "${extractedTitle}")` : ''}${extractedNiche ? ` (Niche: "${extractedNiche}")` : ''}`
    );
    return intelligence;
};
