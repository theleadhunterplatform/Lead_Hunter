import axios, { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import prisma from '../lib/prisma';
import { NormalizedScrapedItem } from './scrapedog-scraper.service';

export interface VoyagerCommentLead {
    postId: string;
    postUrl: string;
    clientPostContent: string;
    clientAuthorName: string;
    clientAuthorUrl: string;
    agencyPitchText: string;
    agencyName: string;
    timestamp: number;
    relativeTime?: string;
}

export class LinkedInVoyagerService {
    /**
     * Resolves active credentials from database settings or environment variables.
     */
    public static async getCredentials(): Promise<{ liAt: string; jsessionId: string } | null> {
        try {
            const liAtSetting = await prisma.setting.findUnique({ where: { key: 'linkedin_session_cookie' } });
            const jsessionSetting = await prisma.setting.findUnique({ where: { key: 'linkedin_jsessionid' } });

            const liAt = String(liAtSetting?.value || process.env.LINKEDIN_LI_AT || '').trim();
            const jsessionId = String(jsessionSetting?.value || process.env.LINKEDIN_JSESSIONID || '').trim();

            if (!liAt || !jsessionId) return null;
            return { liAt, jsessionId };
        } catch {
            return null;
        }
    }

    /**
     * Creates an authenticated Axios client configured for LinkedIn Voyager REST API.
     */
    private static createClient(credentials: { liAt: string; jsessionId: string }, proxyUrl?: string | null): AxiosInstance {
        const csrfToken = credentials.jsessionId.replace(/^"|"$/g, '').replace(/^ajax:/, '');
        const cookieHeader = `li_at=${credentials.liAt}; JSESSIONID="ajax:${csrfToken}";`;

        let httpsAgent: any = undefined;
        if (proxyUrl) {
            try {
                httpsAgent = new HttpsProxyAgent(proxyUrl);
            } catch {
                // fallback to direct
            }
        }

        return axios.create({
            baseURL: 'https://www.linkedin.com/voyager/api',
            timeout: 20000,
            maxRedirects: 0,
            httpsAgent,
            headers: {
                'csrf-token': `ajax:${csrfToken}`,
                'Cookie': cookieHeader,
                'x-restli-protocol-version': '2.0.0',
                'x-li-lang': 'en_US',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'accept': 'application/vnd.linkedin.normalized+json+2.1',
            },
            validateStatus: (status) => status >= 200 && status < 400,
        });
    }

    /**
     * Extracts the LinkedIn vanity handle from a profile URL.
     * E.g. "https://www.linkedin.com/in/purnendutmisra/" -> "purnendutmisra"
     */
    public static extractVanityHandle(url: string): string | null {
        const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
        return match ? match[1].replace(/\/$/, '') : null;
    }

    /**
     * Scrapes target profile comments and extracts prospective client leads via Voyager REST API.
     */
    public static async scrapeTargetProfileComments(
        target: { name: string; url: string; id?: string },
        proxyUrl?: string | null
    ): Promise<NormalizedScrapedItem[]> {
        const credentials = await this.getCredentials();
        if (!credentials) {
            throw new Error('LinkedIn session credentials (li_at, JSESSIONID) not configured in database settings.');
        }

        const vanity = this.extractVanityHandle(target.url);
        if (!vanity) {
            throw new Error(`Invalid LinkedIn profile URL: ${target.url}`);
        }

        const client = this.createClient(credentials, proxyUrl);
        console.log(`⚡ [VoyagerAPI] Fetching comments for "${target.name}" (${vanity}) via Voyager REST API...`);

        // Step 1: Resolve Member URN from vanity handle
        let profileUrn = '';
        try {
            const profileResp = await client.get(`/identity/profiles/${encodeURIComponent(vanity)}`);
            if (profileResp.data?.entityUrn) {
                profileUrn = profileResp.data.entityUrn;
            } else if (profileResp.data?.elements?.[0]?.entityUrn) {
                profileUrn = profileResp.data.elements[0].entityUrn;
            }
        } catch (err: any) {
            console.warn(`⚡ [VoyagerAPI] Could not resolve entityUrn for ${vanity}: ${err.message}. Trying direct feed.`);
        }

        // Step 2: Query member comments stream
        const endpoint = profileUrn
            ? `/identity/profileUpdatesV2?count=25&includeLongTermHistory=true&moduleKey=member-comments%3Aphone&q=memberComments&profileUrn=${encodeURIComponent(profileUrn)}`
            : `/identity/profileUpdatesV2?count=25&includeLongTermHistory=true&moduleKey=member-comments%3Aphone&q=memberComments&profileUrn=urn:li:fsd_profile:${vanity}`;

        let resp;
        try {
            resp = await client.get(endpoint);
        } catch (apiErr: any) {
            if (apiErr.response?.status === 302 || apiErr.response?.headers?.location) {
                throw new Error('LinkedIn session cookie (li_at) has expired or been revoked by LinkedIn. Please re-login.');
            }
            throw apiErr;
        }

        const data = resp.data || {};
        const elements: any[] = data.elements || [];
        const included: any[] = data.included || [];

        console.log(`⚡ [VoyagerAPI] Received ${elements.length} activity item(s) (${included.length} metadata objects) for ${target.name}.`);

        const leads: NormalizedScrapedItem[] = [];

        // Build lookup map for included entities
        const entityMap = new Map<string, any>();
        for (const inc of included) {
            if (inc.entityUrn) entityMap.set(inc.entityUrn, inc);
            if (inc.$URN) entityMap.set(inc.$URN, inc);
        }

        for (const el of elements) {
            try {
                // Extract comment pitch text made by the target agency
                const commentText = el.commentary?.text?.text || el.commentary?.text || '';
                const targetUrn = el.targetUrn || el.updateMetadata?.urn || '';

                // Look for parent post
                let parentPostText = '';
                let clientAuthorName = '';
                let clientAuthorUrl = '';
                let postUrl = '';
                let postTimestamp = Date.now();

                // Check for embedded post in element
                const parentUpdate = el.resharedUpdate || el.parentUpdate || (targetUrn ? entityMap.get(targetUrn) : null);
                if (parentUpdate) {
                    parentPostText = parentUpdate.commentary?.text?.text || parentUpdate.commentary?.text || '';
                    if (parentUpdate.actor) {
                        clientAuthorName = parentUpdate.actor.name?.text || parentUpdate.actor.name || '';
                        clientAuthorUrl = parentUpdate.actor.navigationContext?.actionTarget || '';
                    }
                    if (parentUpdate.permalink) {
                        postUrl = parentUpdate.permalink;
                    }
                    if (parentUpdate.created?.time) {
                        postTimestamp = parentUpdate.created.time;
                    }
                }

                // If parent post commentary wasn't resolved, extract prospective client name from agency's greeting
                if (!clientAuthorName && commentText) {
                    const greetMatch = commentText.match(/^(?:Hi|Hey|Hello|Dear)\s+([A-Za-z0-9_\s.()]{2,30}?)(?:,|\s+we\b|\s+I\b|\s+at\b|\s*!)/i);
                    if (greetMatch && greetMatch[1]) {
                        const candidate = greetMatch[1].trim();
                        if (candidate.length >= 3 && !/there|everyone|all|team/i.test(candidate)) {
                            clientAuthorName = candidate;
                        }
                    }
                }

                // Generate exact permalink if missing
                if (!postUrl && targetUrn) {
                    const cleanUrn = targetUrn.replace(/^urn:li:fsd_update:\(/, '').replace(/\)$/, '');
                    postUrl = `https://www.linkedin.com/feed/update/${cleanUrn}/`;
                }

                // Lead content: Prioritize the client's original post text, falling back to comment context
                const leadContent = parentPostText && parentPostText.length >= 25
                    ? parentPostText
                    : (commentText ? `[Competitor Pitch Context]\n${commentText}` : '');

                if (!leadContent || leadContent.length < 20) continue;

                const postId = targetUrn
                    ? `li_${targetUrn.replace(/[^a-zA-Z0-9]/g, '_').slice(-30)}`
                    : `voyager_${Buffer.from(leadContent.slice(0, 30)).toString('hex')}`;

                leads.push({
                    id: postId,
                    url: postUrl || target.url,
                    content: leadContent,
                    platform: 'linkedin',
                    author: {
                        name: clientAuthorName || 'LinkedIn Buyer',
                        url: clientAuthorUrl || undefined,
                    },
                    postedAt: {
                        timestamp: postTimestamp,
                        date: new Date(postTimestamp).toISOString(),
                    },
                    engagement: { likes: 0, comments: 0, shares: 0 },
                    raw_result: {
                        source: 'voyager_api',
                        agencyTarget: target.name,
                        agencyComment: commentText,
                        element: el,
                    },
                });
            } catch (err: any) {
                console.warn(`⚡ [VoyagerAPI] Error parsing item: ${err.message}`);
            }
        }

        console.log(`🎯 [VoyagerAPI] Extracted ${leads.length} qualified lead(s) for "${target.name}".`);
        return leads;
    }
}
