import axios from 'axios';
import config from '../config';
import LeadIntelligence from '../models/lead-intelligence.model';
import LeadPost from '../models/lead-post.model';

/**
 * Generates strategic lead intelligence using OpenRouter (OpenAI-compatible)
 * @param post The post object from database
 * @returns The stored LeadIntelligence document or null
 */
export const generateLeadIntelligence = async (post: any) => {
    const apiKey = config.openRouter.apiKey;
    if (!apiKey) {
        throw new Error('OPEN_ROUTER_API key is not configured on the server');
    }

    console.log(`🧠 [Intelligence] Generating strategic report for post: ${post.post_id} (${post.platform})`);

    const prompt = `
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

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: config.openRouter.intelModel,
            messages: [
                {
                    role: 'system',
                    content: 'You are a high-level sales strategist and lead generation expert for a premium digital agency. Your goal is to analyze social media leads and provide deep strategic intelligence to help close high-ticket deals.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://antigravity-lead-gen.com',
                'X-Title': 'Antigravity Lead Gen',
                'Content-Type': 'application/json'
            }
        });

        const intelligenceContent = response.data.choices[0].message.content;

        if (!intelligenceContent) {
            throw new Error('No content returned from AI');
        }

        // Store in DB
        const intelligence = await LeadIntelligence.findOneAndUpdate(
            { post_id: post._id },
            { content: intelligenceContent },
            { upsert: true, new: true }
        );

        // Also sync to LeadPost for easier list access
        await LeadPost.updateOne(
            { _id: post._id || post.id },
            { intelligence: intelligenceContent }
        );

        console.log(`✅ [Intelligence] Report saved for post: ${post.post_id}`);
        return intelligence;
    } catch (error: any) {
        const detail =
            error.response?.data?.error?.message
            || error.response?.data?.error
            || error.response?.data?.message
            || error.message
            || 'Unknown OpenRouter error';
        console.error('Error generating lead intelligence:', error.response?.data || error.message);
        throw new Error(`Lead intelligence generation failed: ${detail}`);
    }
};
