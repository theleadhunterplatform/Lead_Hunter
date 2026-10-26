import axios from 'axios';
import config from '../config';
import * as settingService from './setting.service';
import { resolveActiveScraperKey, markScraperKeyExhausted } from './scraper-key.service';
import { NormalizedScrapedItem } from './scrapedog-scraper.service';
import { extractTimestampFromUrlOrSnippet } from '../utils/scraped-item.utils';

export class ScrapingBeeScraperService {
    public static async getApiKey(): Promise<{ key: string; id?: string } | null> {
        try {
            const active = await resolveActiveScraperKey('scrapingbee');
            if (active && active.key) return active;
        } catch {
            // fallback
        }
        try {
            const dbKey = await settingService.getSetting('scrapingbee_api_key');
            if (dbKey && typeof dbKey === 'string' && dbKey.trim()) {
                return { key: dbKey.trim() };
            }
        } catch {
            // fallback
        }
        const envKey = (config.scrapingbee.apiKey || process.env.SCRAPINGBEE_API_KEY || '').trim();
        return envKey ? { key: envKey } : null;
    }

    public static async isConfigured(): Promise<boolean> {
        const keyRecord = await this.getApiKey();
        return Boolean(keyRecord?.key);
    }

    public static async scrapeKeyword(platform: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            const activeKey = await this.getApiKey();
            if (!activeKey || !activeKey.key) {
                throw new Error('ScrapingBee API key is not configured or all pool keys are exhausted.');
            }

            try {
                console.log(`🐝 [ScrapingBee] Searching ${platform} for "${phrase}" (key: ...${activeKey.key.slice(-4)})`);

                switch (platform) {
                    case 'reddit':
                        return await this.scrapeReddit(activeKey.key, phrase);
                    case 'linkedin':
                        return await this.scrapeLinkedIn(activeKey.key, phrase);
                    case 'twitter':
                        return await this.scrapeTwitter(activeKey.key, phrase);
                    case 'threads':
                        return await this.scrapeThreads(activeKey.key, phrase);
                    default:
                        throw new Error(`Platform "${platform}" not supported by ScrapingBee.`);
                }
            } catch (err: any) {
                const status = err.response?.status;
                const errData = typeof err.response?.data === 'string' ? err.response?.data : JSON.stringify(err.response?.data || '');
                const isLimitOrAuth = status === 401 || status === 403 || status === 429 || /limit|exhaust|quota|unauthorized|credit/i.test(errData || err.message);

                if (isLimitOrAuth && attempts < maxAttempts) {
                    const reason = status === 401 ? 'Invalid API Key (401)' : `Limit / Quota exhausted (${status || 'error'}): ${err.message}`;
                    console.warn(`🐝 [ScrapingBee] Key exhausted: ${reason}. Rotating to next key...`);
                    await markScraperKeyExhausted('scrapingbee', activeKey.id || activeKey.key, reason);
                    continue;
                }
                throw err;
            }
        }

        throw new Error('All ScrapingBee keys exhausted or failed.');
    }

    private static async scrapeReddit(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const targetUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(phrase)}&sort=new&t=day&limit=25`;
        const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&render_js=false&premium_proxy=false`;

        try {
            const response = await axios.get(apiUrl, { timeout: 30000 });
            let jsonBody: any = response.data;
            if (typeof jsonBody === 'string') {
                try { jsonBody = JSON.parse(jsonBody); } catch { /* ignore */ }
            }

            const children = jsonBody?.data?.children || [];
            const results: NormalizedScrapedItem[] = [];

            for (const child of children) {
                const post = child.data;
                if (!post || post.over_18 || post.is_self === false) continue;
                const content = `${post.title || ''}\n\n${post.selftext || ''}`.trim();
                if (!content) continue;

                results.push({
                    id: post.id || post.name,
                    url: `https://www.reddit.com${post.permalink || ''}`,
                    content,
                    platform: 'reddit',
                    author: {
                        name: post.author || 'Reddit User',
                        handle: post.author,
                        url: `https://www.reddit.com/user/${post.author}`,
                    },
                    postedAt: {
                        timestamp: post.created_utc ? post.created_utc * 1000 : Date.now(),
                        date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString(),
                    },
                    engagement: {
                        likes: post.score || 0,
                        comments: post.num_comments || 0,
                        shares: 0,
                    },
                    raw_result: post,
                });
            }
            return results;
        } catch {
            return this.scrapeGoogleSerp(apiKey, `site:reddit.com/r/forhire OR site:reddit.com/r/freelance "${phrase}"`, 'reddit');
        }
    }

    private static async scrapeLinkedIn(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        return this.scrapeGoogleSerp(apiKey, `site:linkedin.com/posts "${phrase}"`, 'linkedin');
    }

    private static async scrapeTwitter(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        return this.scrapeGoogleSerp(apiKey, `(site:x.com OR site:twitter.com) "${phrase}"`, 'twitter');
    }

    private static async scrapeThreads(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        return this.scrapeGoogleSerp(apiKey, `site:threads.net "${phrase}"`, 'threads');
    }

    private static async scrapeGoogleSerp(apiKey: string, query: string, platform: string): Promise<NormalizedScrapedItem[]> {
        const serpUrl = `https://app.scrapingbee.com/api/v1/store/google?api_key=${apiKey}&search=${encodeURIComponent(query)}&language=en&nb_results=20`;

        const response = await axios.get(serpUrl, { timeout: 35000 });
        const data = response.data;
        const organic = data?.organic_results || [];
        const results: NormalizedScrapedItem[] = [];

        for (const item of organic) {
            const url = item.url || item.link;
            const content = `${item.title || ''}\n\n${item.description || item.snippet || ''}`.trim();
            if (!url || !content) continue;

            let authorName: string | undefined;
            let authorHandle: string | undefined;
            let authorUrl: string | undefined;

            if (platform === 'twitter') {
                const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/);
                if (match) {
                    authorHandle = match[1];
                    authorName = `@${match[1]}`;
                    authorUrl = `https://x.com/${match[1]}`;
                }
            } else if (platform === 'linkedin') {
                const authorMatch = (item.title || '').match(/^([^|\-–]+)/);
                if (authorMatch) {
                    authorName = authorMatch[1].replace(/on LinkedIn.*$/i, '').trim();
                }
            } else if (platform === 'reddit') {
                const authorMatch = (item.description || item.snippet || '').match(/Posted by\s+u\/([a-zA-Z0-9_-]+)/i);
                if (authorMatch) {
                    authorHandle = authorMatch[1];
                    authorName = `u/${authorMatch[1]}`;
                    authorUrl = `https://www.reddit.com/user/${authorMatch[1]}`;
                }
            }

            const snippet = item.description || item.snippet || '';
            const timing = extractTimestampFromUrlOrSnippet(url, platform, snippet);

            results.push({
                id: Buffer.from(url).toString('base64url').slice(0, 36),
                url,
                content,
                platform,
                author: {
                    name: authorName || (item.title ? item.title.slice(0, 50) : undefined),
                    handle: authorHandle,
                    url: authorUrl || url,
                },
                postedAt: timing?.timestamp ? {
                    timestamp: timing.timestamp,
                    date: timing.date || new Date(timing.timestamp).toISOString(),
                } : undefined,
                engagement: { likes: 0, comments: 0, shares: 0 },
                raw_result: item,
            });
        }

        return results;
    }

    public static async scrapeTargetProfile(target: { name: string; url: string; id: string }): Promise<NormalizedScrapedItem[]> {
        const activeKey = await this.getApiKey();
        if (!activeKey || !activeKey.key) throw new Error('ScrapingBee is not configured for watchlist targets.');

        const slugMatch = target.url.match(/linkedin\.com\/in\/([^/?#]+)/);
        const slug = slugMatch ? slugMatch[1] : '';
        const query = slug ? `site:linkedin.com/posts inurl:${slug}` : `site:linkedin.com/posts "${target.name}"`;

        return this.scrapeGoogleSerp(activeKey.key, query, 'linkedin');
    }
}
