import axios from 'axios';
import config from '../config';
import * as settingService from './setting.service';
import { resolveActiveScraperKey, markScraperKeyExhausted } from './scraper-key.service';
import { NormalizedScrapedItem } from './scrapedog-scraper.service';
import { extractTimestampFromUrlOrSnippet } from '../utils/scraped-item.utils';

export class ZyteScraperService {
    public static async getApiKey(): Promise<{ key: string; id?: string } | null> {
        try {
            const active = await resolveActiveScraperKey('zyte');
            if (active && active.key) return active;
        } catch {
            // fallback
        }
        try {
            const dbKey = await settingService.getSetting('zyte_api_key');
            if (dbKey && typeof dbKey === 'string' && dbKey.trim()) {
                return { key: dbKey.trim() };
            }
        } catch {
            // fallback
        }
        const envKey = (config.zyte.apiKey || process.env.ZYTE_API_KEY || '').trim();
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
                throw new Error('Zyte API key is not configured or all pool keys are exhausted.');
            }

            try {
                console.log(`⚡ [Zyte] Searching ${platform} for "${phrase}" (key: ...${activeKey.key.slice(-4)})`);

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
                        throw new Error(`Platform "${platform}" not supported by Zyte scraper.`);
                }
            } catch (err: any) {
                const status = err.response?.status;
                const errData = typeof err.response?.data === 'string' ? err.response?.data : JSON.stringify(err.response?.data || '');
                const isLimitOrAuth = status === 401 || status === 403 || status === 429 || /limit|exhaust|quota|unauthorized|forbidden/i.test(errData || err.message);

                if (isLimitOrAuth && attempts < maxAttempts) {
                    const reason = status === 401 ? 'Invalid API Key (401)' : `Limit / Quota exhausted (${status || 'error'}): ${err.message}`;
                    console.warn(`⚡ [Zyte] Key exhausted: ${reason}. Rotating to next key...`);
                    await markScraperKeyExhausted('zyte', activeKey.id || activeKey.key, reason);
                    continue;
                }
                throw err;
            }
        }

        throw new Error('All Zyte keys exhausted or failed.');
    }

    private static async scrapeReddit(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const targetUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(phrase)}&sort=new&t=day&limit=25`;

        try {
            const res = await axios.post(
                'https://api.zyte.com/v1/extract',
                {
                    url: targetUrl,
                    httpResponseBody: true,
                },
                {
                    auth: { username: apiKey, password: '' },
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 35000,
                }
            );

            const base64Body = res.data?.httpResponseBody;
            const decodedJson = base64Body ? Buffer.from(base64Body, 'base64').toString('utf8') : '{}';
            let parsed: any;
            try { parsed = JSON.parse(decodedJson); } catch { parsed = {}; }

            const children = parsed?.data?.children || [];
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
            return this.scrapeGoogleViaZyte(apiKey, `site:reddit.com/r/forhire OR site:reddit.com/r/freelance "${phrase}"`, 'reddit');
        }
    }

    private static async scrapeLinkedIn(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        return this.scrapeGoogleViaZyte(apiKey, `site:linkedin.com/posts "${phrase}"`, 'linkedin');
    }

    private static async scrapeTwitter(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        return this.scrapeGoogleViaZyte(apiKey, `(site:x.com OR site:twitter.com) "${phrase}"`, 'twitter');
    }

    private static async scrapeThreads(apiKey: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        return this.scrapeGoogleViaZyte(apiKey, `site:threads.net "${phrase}"`, 'threads');
    }

    private static async scrapeGoogleViaZyte(apiKey: string, query: string, platform: string): Promise<NormalizedScrapedItem[]> {
        const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&num=20`;

        const res = await axios.post(
            'https://api.zyte.com/v1/extract',
            {
                url: targetUrl,
                browserHtml: true,
            },
            {
                auth: { username: apiKey, password: '' },
                headers: { 'Content-Type': 'application/json' },
                timeout: 45000,
            }
        );

        const html = res.data?.browserHtml || (res.data?.httpResponseBody ? Buffer.from(res.data.httpResponseBody, 'base64').toString('utf8') : '');

        return this.parseGoogleHtml(html, platform);
    }

    private static parseGoogleHtml(html: string, platform: string): NormalizedScrapedItem[] {
        const results: NormalizedScrapedItem[] = [];
        const linkRegex = /<a[^>]+href="(https:\/\/[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
            let url = match[1];
            const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();

            if (url.includes('google.com') || url.includes('/search?')) continue;
            if (url.startsWith('/url?q=')) {
                url = decodeURIComponent(url.replace('/url?q=', '').split('&')[0]);
            }

            let authorName: string | undefined;
            let authorHandle: string | undefined;
            let authorUrl: string | undefined;

            if (platform === 'twitter') {
                const twMatch = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/);
                if (twMatch) {
                    authorHandle = twMatch[1];
                    authorName = `@${twMatch[1]}`;
                    authorUrl = `https://x.com/${twMatch[1]}`;
                }
            } else if (platform === 'linkedin') {
                const authorMatch = rawTitle.match(/^([^|\-–]+)/);
                if (authorMatch) {
                    authorName = authorMatch[1].replace(/on LinkedIn.*$/i, '').trim();
                }
            } else if (platform === 'reddit') {
                const authorMatch = html.slice(match.index, match.index + 500).match(/u\/([a-zA-Z0-9_-]+)/i);
                if (authorMatch) {
                    authorHandle = authorMatch[1];
                    authorName = `u/${authorMatch[1]}`;
                    authorUrl = `https://www.reddit.com/user/${authorMatch[1]}`;
                }
            }

            const timestamp = extractTimestampFromUrlOrSnippet(url, rawTitle);

            results.push({
                id: Buffer.from(url).toString('base64url').slice(0, 36),
                url,
                content: rawTitle,
                platform,
                author: {
                    name: authorName || (rawTitle ? rawTitle.slice(0, 50) : undefined),
                    handle: authorHandle,
                    url: authorUrl || url,
                },
                postedAt: timestamp ? { timestamp, date: new Date(timestamp).toISOString() } : undefined,
                engagement: { likes: 0, comments: 0, shares: 0 },
                raw_result: { title: rawTitle, url },
            });
        }

        return results;
    }

    public static async scrapeTargetProfile(target: { name: string; url: string; id: string }): Promise<NormalizedScrapedItem[]> {
        const activeKey = await this.getApiKey();
        if (!activeKey || !activeKey.key) throw new Error('Zyte is not configured for watchlist targets.');

        const slugMatch = target.url.match(/linkedin\.com\/in\/([^/?#]+)/);
        const slug = slugMatch ? slugMatch[1] : '';
        const query = slug ? `site:linkedin.com/posts inurl:${slug}` : `site:linkedin.com/posts "${target.name}"`;

        return this.scrapeGoogleViaZyte(activeKey.key, query, 'linkedin');
    }
}
