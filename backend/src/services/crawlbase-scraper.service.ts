import axios from 'axios';
import config from '../config';
import * as settingService from './setting.service';
import { resolveActiveScraperKey, markScraperKeyExhausted } from './scraper-key.service';
import { NormalizedScrapedItem } from './scrapedog-scraper.service';
import { extractTimestampFromUrlOrSnippet } from '../utils/scraped-item.utils';

export class CrawlbaseScraperService {
    public static async getToken(): Promise<{ key: string; id?: string } | null> {
        try {
            const active = await resolveActiveScraperKey('crawlbase');
            if (active && active.key) {
                return active;
            }
        } catch {
            // fallback
        }
        try {
            const dbToken = await settingService.getSetting('crawlbase_token');
            if (dbToken && typeof dbToken === 'string' && dbToken.trim()) {
                return { key: dbToken.trim() };
            }
        } catch {
            // fallback to config
        }
        const envToken = config.crawlbase.token.trim();
        return envToken ? { key: envToken } : null;
    }

    public static async isConfigured(): Promise<boolean> {
        const tokenRecord = await this.getToken();
        return Boolean(tokenRecord?.key);
    }

    /**
     * Scrapes keyword search results across supported platforms using Crawlbase.
     */
    public static async scrapeKeyword(platform: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            const active = await this.getToken();
            if (!active || !active.key) {
                throw new Error('Crawlbase token is not configured or all pool tokens are exhausted.');
            }

            try {
                console.log(`🕷️ [Crawlbase] Searching ${platform} for "${phrase}" (token: ...${active.key.slice(-4)})`);

                switch (platform) {
                    case 'reddit':
                        return await this.scrapeReddit(active.key, phrase);
                    case 'linkedin':
                        return await this.scrapeLinkedIn(active.key, phrase);
                    case 'twitter':
                        return await this.scrapeTwitter(active.key, phrase);
                    case 'threads':
                        return await this.scrapeThreads(active.key, phrase);
                    default:
                        throw new Error(`Platform "${platform}" not supported by Crawlbase scraper.`);
                }
            } catch (err: any) {
                const status = err.response?.status;
                const errData = typeof err.response?.data === 'string' ? err.response?.data : JSON.stringify(err.response?.data || '');
                const isLimitOrAuth = status === 401 || status === 403 || status === 429 || status === 503 || /limit|exhaust|quota|unauthorized|invalid_token/i.test(errData || err.message);

                if (isLimitOrAuth && attempts < maxAttempts) {
                    const reason = status === 401 ? 'Invalid Token (401)' : `Limit / Quota exhausted (${status || 'error'}): ${err.message}`;
                    console.warn(`🕷️ [Crawlbase] Token exhausted: ${reason}. Rotating to next token...`);
                    await markScraperKeyExhausted('crawlbase', active.id || active.key, reason);
                    continue;
                }
                throw err;
            }
        }

        throw new Error('All Crawlbase tokens exhausted or failed.');
    }

    /**
     * Reddit: Crawlbase crawling API fetches Reddit search API directly with rotating proxies.
     */
    private static async scrapeReddit(token: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const targetUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(phrase)}&sort=new&t=day&limit=25`;
        const apiUrl = `https://api.crawlbase.com/?token=${token}&url=${encodeURIComponent(targetUrl)}&format=json`;

        try {
            const response = await axios.get(apiUrl, { timeout: 30000 });
            let jsonBody: any = response.data;
            if (typeof jsonBody === 'string') {
                try {
                    jsonBody = JSON.parse(jsonBody);
                } catch {
                    // if crawlbase wrapped in html or text
                }
            }

            const children = jsonBody?.data?.children || [];
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

            console.log(`🕷️ [Crawlbase] Extracted ${items.length} Reddit items for "${phrase}"`);
            return items;
        } catch (error: any) {
            console.warn(`[Crawlbase] Reddit crawl failed (${error.message}); attempting SERP fallback...`);
            return this.scrapeGoogleSerp(token, `site:reddit.com "${phrase}"`, 'reddit');
        }
    }

    /**
     * LinkedIn: Uses Crawlbase Scraper API to query Google SERP for LinkedIn posts.
     */
    private static async scrapeLinkedIn(token: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const query = `site:linkedin.com/posts "${phrase}"`;
        return this.scrapeGoogleSerp(token, query, 'linkedin');
    }

    /**
     * Twitter: Uses Crawlbase Scraper API to query Google SERP for tweets.
     */
    private static async scrapeTwitter(token: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const query = `(site:x.com OR site:twitter.com) "${phrase}"`;
        return this.scrapeGoogleSerp(token, query, 'twitter');
    }

    /**
     * Threads: Uses Crawlbase Scraper API to query Google SERP for Threads.
     */
    private static async scrapeThreads(token: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const query = `site:threads.net "${phrase}"`;
        return this.scrapeGoogleSerp(token, query, 'threads');
    }

    /**
     * Generic Google Search Scraper via Crawlbase Scraper API.
     */
    private static async scrapeGoogleSerp(
        token: string,
        query: string,
        platform: string
    ): Promise<NormalizedScrapedItem[]> {
        // Enforce Google's "past 24 hours" filter (&tbs=qdr:d) to strictly prevent returning historical posts
        const targetGoogleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=en&tbs=qdr:d`;
        const apiUrl = `https://api.crawlbase.com/scraper?token=${token}&url=${encodeURIComponent(targetGoogleUrl)}`;

        const response = await axios.get(apiUrl, { timeout: 35000 });
        const data = response.data?.body || response.data;
        const results = data?.organic_results || data?.organic || [];

        const items: NormalizedScrapedItem[] = [];

        for (const res of results) {
            const url = res.link || res.url;
            if (!url) continue;

            const content = [res.title, res.snippet || res.description].filter(Boolean).join('\n');
            if (!content.trim()) continue;

            const id = this.extractIdFromUrl(url, platform) || `crawlbase-${Buffer.from(url).toString('base64').slice(0, 16)}`;
            const author = this.extractAuthorFromUrl(url, res.title, platform);
            const timing = extractTimestampFromUrlOrSnippet(url, platform, res.snippet || res.description);

            items.push({
                id,
                url,
                content,
                platform,
                author,
                postedAt: timing.timestamp ? {
                    date: timing.date,
                    timestamp: timing.timestamp,
                } : undefined,
                engagement: {
                    likes: 0,
                    comments: 0,
                    shares: 0,
                },
                raw_result: res,
            });
        }

        console.log(`🕷️ [Crawlbase] Extracted ${items.length} ${platform} items from Google SERP for query`);
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

    /**
     * Scrapes watchlist target profile recent posts and discussions using Crawlbase Google SERP with past 24h filter.
     */
    public static async scrapeTargetProfile(target: { id: string; name: string; url: string; platform: string }): Promise<NormalizedScrapedItem[]> {
        const activeToken = await this.getToken();
        if (!activeToken || !activeToken.key) {
            throw new Error('Crawlbase token is not configured or all pool tokens are exhausted.');
        }

        let slug: string | null = null;
        try {
            const match = target.url.match(/linkedin\.com\/(?:in|company)\/([^/?#]+)/);
            if (match) slug = match[1];
        } catch {}

        const query = slug
            ? `site:linkedin.com/posts inurl:${slug}`
            : `site:linkedin.com/posts "${target.name}"`;

        console.log(`🕷️ [Crawlbase] Scraping watchlist target "${target.name}" (query: ${query})`);
        return this.scrapeGoogleSerp(activeToken.key, query, 'linkedin');
    }
}
