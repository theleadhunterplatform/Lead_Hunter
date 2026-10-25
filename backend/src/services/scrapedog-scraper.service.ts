import axios from 'axios';
import config from '../config';
import * as settingService from './setting.service';
import { resolveActiveScraperKey, markScraperKeyExhausted } from './scraper-key.service';

export interface NormalizedScrapedItem {
    id: string;
    url: string;
    content: string;
    platform: string;
    author?: {
        name?: string;
        handle?: string;
        url?: string;
        publicIdentifier?: string;
    };
    postedAt?: {
        date?: string;
        timestamp?: number;
    };
    engagement?: {
        likes: number;
        comments: number;
        shares: number;
    };
    raw_result?: any;
}

export class ScrapedogScraperService {
    public static async getApiKey(): Promise<{ key: string; id?: string } | null> {
        try {
            const active = await resolveActiveScraperKey('scrapedog');
            if (active && active.key) {
                return active;
            }
        } catch {
            // fallback
        }
        try {
            const dbKey = (await settingService.getSetting('scrapingdog_api_key')) || (await settingService.getSetting('scrapedog_api_key'));
            if (dbKey && typeof dbKey === 'string' && dbKey.trim()) {
                return { key: dbKey.trim() };
            }
        } catch {
            // fallback to config
        }
        const envKey = (process.env.SCRAPINGDOG_API_KEY || process.env.SCRAPEDOG_API_KEY || config.scrapedog.apiKey || '').trim();
        return envKey ? { key: envKey } : null;
    }

    public static async isConfigured(): Promise<boolean> {
        const keyRecord = await this.getApiKey();
        return Boolean(keyRecord?.key);
    }

    /**
     * Scrape keyword search results across supported platforms using Scrapedog.
     */
    public static async scrapeKeyword(platform: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            const activeKey = await this.getApiKey();
            if (!activeKey || !activeKey.key) {
                throw new Error('Scrapedog API key is not configured or all pool keys are exhausted.');
            }

            try {
                console.log(`🐶 [Scrapedog] Searching ${platform} for "${phrase}" (key: ...${activeKey.key.slice(-4)})`);

                switch (platform) {
                    case 'reddit':
                        return await this.scrapeReddit(activeKey.key, phrase);
                    case 'linkedin':
                    case 'twitter':
                    case 'threads':
                        return await this.scrapeGoogleSerp(activeKey.key, platform, phrase);
                    default:
                        throw new Error(`Platform "${platform}" not supported by Scrapedog scraper.`);
                }
            } catch (err: any) {
                const status = err.response?.status;
                const errData = typeof err.response?.data === 'string' ? err.response?.data : JSON.stringify(err.response?.data || '');
                const isLimitOrAuth = status === 401 || status === 403 || status === 429 || /limit|exhaust|quota|unauthorized/i.test(errData || err.message);

                if (isLimitOrAuth && attempts < maxAttempts) {
                    const reason = status === 401 ? 'Invalid API Key (401)' : `Limit / Quota exhausted (${status || 'error'}): ${err.message}`;
                    console.warn(`🐶 [Scrapedog] Key exhausted: ${reason}. Rotating to next key...`);
                    await markScraperKeyExhausted('scrapedog', activeKey.id || activeKey.key, reason);
                    continue;
                }
                throw err;
            }
        }

        throw new Error('All Scrapedog keys exhausted or failed.');
    }

    /**
     * Reddit: Uses Scrapedog's Web Scraping API to query Reddit's search JSON endpoint without getting IP banned.
     */
    private static async scrapeReddit(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(phrase)}&sort=new&t=day&limit=25`;
        const apiUrl = `https://api.scrapingdog.com/scrape?api_key=${apiKey}&url=${encodeURIComponent(redditUrl)}&dynamic=false`;

        try {
            const response = await axios.get(apiUrl, { timeout: 25000 });
            const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            const children = data?.data?.children || [];

            const items: NormalizedScrapedItem[] = [];
            for (const child of children) {
                const post = child.data;
                if (!post || !post.id) continue;

                const content = [post.title, post.selftext].filter(Boolean).join('\n\n');
                const permalink = post.permalink?.startsWith('http')
                    ? post.permalink
                    : `https://www.reddit.com${post.permalink || ''}`;

                items.push({
                    id: post.id,
                    url: permalink,
                    content,
                    platform: 'reddit',
                    author: {
                        name: post.author,
                        handle: post.author,
                        url: post.author ? `https://www.reddit.com/user/${post.author}` : undefined,
                    },
                    postedAt: {
                        timestamp: post.created_utc ? post.created_utc * 1000 : Date.now(),
                        date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : new Date().toISOString(),
                    },
                    engagement: {
                        likes: post.ups || 0,
                        comments: post.num_comments || 0,
                        shares: 0,
                    },
                    raw_result: post,
                });
            }

            console.log(`🐶 [Scrapedog] Found ${items.length} Reddit items for "${phrase}"`);
            return items;
        } catch (error: any) {
            console.warn(`[Scrapedog] Direct Reddit scrape failed (${error.message}); trying Google SERP fallback...`);
            return this.scrapeGoogleSerp(apiKey, `site:reddit.com "${phrase}"`, 'reddit');
        }
    }

    /**
     * LinkedIn: Queries Google SERP via Scrapedog for recent LinkedIn intent posts.
     */
    private static async scrapeLinkedIn(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const query = `site:linkedin.com/posts "${phrase}"`;
        return this.scrapeGoogleSerp(apiKey, query, 'linkedin');
    }

    /**
     * Twitter / X: Queries Google SERP via Scrapedog for fresh posts.
     */
    private static async scrapeTwitter(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const query = `(site:x.com OR site:twitter.com) "${phrase}"`;
        return this.scrapeGoogleSerp(apiKey, query, 'twitter');
    }

    /**
     * Threads: Queries Google SERP via Scrapedog for fresh Threads posts.
     */
    private static async scrapeThreads(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const query = `site:threads.net "${phrase}"`;
        return this.scrapeGoogleSerp(apiKey, query, 'threads');
    }

    /**
     * Generic Google Search scraper using Scrapedog Google Search API.
     */
    private static async scrapeGoogleSerp(
        apiKey: string,
        query: string,
        platform: string
    ): Promise<NormalizedScrapedItem[]> {
        const searchApiUrl = `https://api.scrapingdog.com/google?api_key=${apiKey}&query=${encodeURIComponent(query)}&results=20&country=us`;

        const response = await axios.get(searchApiUrl, { timeout: 30000 });
        const data = response.data;

        const results = data?.organic_results || data?.organic || [];
        const items: NormalizedScrapedItem[] = [];

        for (const res of results) {
            const url = res.link || res.url;
            if (!url) continue;

            const content = [res.title, res.snippet || res.description].filter(Boolean).join('\n');
            if (!content.trim()) continue;

            const id = this.extractIdFromUrl(url, platform) || `scrapedog-${Buffer.from(url).toString('base64').slice(0, 16)}`;
            const author = this.extractAuthorFromUrl(url, res.title, platform);

            items.push({
                id,
                url,
                content,
                platform,
                author,
                postedAt: {
                    date: new Date().toISOString(),
                    timestamp: Date.now(),
                },
                engagement: {
                    likes: 0,
                    comments: 0,
                    shares: 0,
                },
                raw_result: res,
            });
        }

        console.log(`🐶 [Scrapedog] Extracted ${items.length} ${platform} items from Google SERP for query`);
        return items;
    }

    private static extractIdFromUrl(url: string, platform: string): string | null {
        try {
            if (platform === 'linkedin') {
                const match = url.match(/\/posts\/([a-zA-Z0-9_-]+)/) || url.match(/\/activity-([0-9]+)/);
                if (match) return match[1];
            } else if (platform === 'twitter') {
                const match = url.match(/status\/([0-9]+)/);
                if (match) return match[1];
            } else if (platform === 'reddit') {
                const match = url.match(/\/comments\/([a-zA-Z0-9]+)/);
                if (match) return match[1];
            } else if (platform === 'threads') {
                const match = url.match(/post\/([a-zA-Z0-9_-]+)/);
                if (match) return match[1];
            }
        } catch {
            return null;
        }
        return null;
    }

    private static extractAuthorFromUrl(url: string, title?: string, platform?: string): { name?: string; handle?: string; url?: string } {
        try {
            if (platform === 'linkedin') {
                const match = url.match(/linkedin\.com\/in\/([^/?#]+)/) || url.match(/linkedin\.com\/posts\/([^_/?#]+)/);
                const handle = match ? match[1] : undefined;
                const name = title?.split('-')[0]?.split('|')[0]?.trim();
                return {
                    name: name || handle,
                    handle,
                    url: handle ? `https://www.linkedin.com/in/${handle}` : url,
                };
            } else if (platform === 'twitter') {
                const match = url.match(/(?:x\.com|twitter\.com)\/([^/?#]+)\/status/);
                const handle = match ? match[1] : undefined;
                return {
                    name: handle,
                    handle,
                    url: handle ? `https://x.com/${handle}` : url,
                };
            } else if (platform === 'threads') {
                const match = url.match(/threads\.net\/@([^/?#]+)/);
                const handle = match ? match[1] : undefined;
                return {
                    name: handle,
                    handle,
                    url: handle ? `https://www.threads.net/@${handle}` : url,
                };
            }
        } catch {
            // fallback
        }
        return { name: title };
    }
}
