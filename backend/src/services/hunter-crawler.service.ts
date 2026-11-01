import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import config from '../config';
import * as settingService from './setting.service';
import { resolveActiveScraperKey } from './scraper-key.service';
import { NormalizedScrapedItem } from './scrapedog-scraper.service';
import { extractTimestampFromUrlOrSnippet } from '../utils/scraped-item.utils';

export class HunterCrawlerService {
    /**
     * Resolves the proxy URL from the scraper key pool, database setting, or env config.
     */
    public static async getProxyUrl(): Promise<string | null> {
        try {
            const active = await resolveActiveScraperKey('hunter_crawler');
            if (active?.key) return active.key.trim();
        } catch {
            // fallback
        }

        try {
            const dbProxy = (await settingService.getSetting('hunter_crawler_proxy_url')) || (await settingService.getSetting('proxy_url'));
            if (typeof dbProxy === 'string' && dbProxy.trim()) return dbProxy.trim();
        } catch {
            // fallback
        }

        const envProxy = (process.env.HUNTER_CRAWLER_PROXY_URL || config.hunterCrawler?.proxyUrl || process.env.PROXY_URL || '').trim();
        return envProxy || null;
    }

    /**
     * Resolves an optional LinkedIn session cookie (li_at) for authenticated in-app scraping.
     */
    public static async getLinkedInCookie(): Promise<string | null> {
        try {
            const dbCookie = await settingService.getSetting('linkedin_session_cookie');
            if (typeof dbCookie === 'string' && dbCookie.trim()) return dbCookie.trim();
        } catch {
            // fallback
        }
        return (process.env.LINKEDIN_LI_AT || config.hunterCrawler?.linkedinCookie || '').trim() || null;
    }

    public static async isConfigured(): Promise<boolean> {
        return true;
    }

    /**
     * Creates a PlaywrightCrawler configured with ultra-low bandwidth consumption (<100KB per request).
     */
    private static createCrawler(
        proxyUrl: string | null,
        requestHandler: (context: any) => Promise<void>,
        options?: {
            cookies?: Array<{ name: string; value: string; domain: string; path?: string }>;
            maxRequests?: number;
        }
    ): PlaywrightCrawler {
        let proxyConfiguration: ProxyConfiguration | undefined;
        if (proxyUrl) {
            try {
                proxyConfiguration = new ProxyConfiguration({
                    proxyUrls: [proxyUrl],
                });
            } catch (err: any) {
                console.warn(`🎯 [HunterCrawler] Invalid proxy configuration URL: ${proxyUrl}. Running direct.`);
            }
        }

        return new PlaywrightCrawler({
            proxyConfiguration,
            maxRequestsPerCrawl: options?.maxRequests || 1,
            navigationTimeoutSecs: 30,
            requestHandlerTimeoutSecs: 60,
            maxRequestRetries: 1,
            headless: true,
            browserPoolOptions: {
                useFingerprints: true,
            },
            preNavigationHooks: [
                async ({ page, context }: any) => {
                    // Inject cookies if available
                    if (options?.cookies && options.cookies.length > 0) {
                        await context.addCookies(options.cookies);
                    }

                    // Strict resource abort: images, fonts, styles, media, telemetry
                    await page.route('**/*', (route: any) => {
                        const resourceType = route.request().resourceType();
                        const url = route.request().url().toLowerCase();

                        if (
                            ['image', 'media', 'font', 'stylesheet'].includes(resourceType) ||
                            /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|css)(\?.*)?$/i.test(url) ||
                            url.includes('google-analytics') ||
                            url.includes('doubleclick') ||
                            url.includes('googletagmanager') ||
                            url.includes('clarity.ms') ||
                            url.includes('scorecardresearch')
                        ) {
                            return route.abort();
                        }
                        return route.continue();
                    });
                },
            ],
            requestHandler,
            failedRequestHandler: async ({ request, error }: any) => {
                console.warn(`🎯 [HunterCrawler] Request failed for ${request.url}:`, (error as Error)?.message || String(error));
            },
        });
    }

    /**
     * Primary entry point to scrape keyword search results across supported platforms.
     */
    public static async scrapeKeyword(platform: string, phrase: string): Promise<NormalizedScrapedItem[]> {
        const proxyUrl = await this.getProxyUrl();
        const maskedProxy = proxyUrl ? proxyUrl.replace(/:[^:@]+@/, ':****@') : 'direct connection';
        console.log(`🎯 [HunterCrawler] Scraping ${platform} for "${phrase}" via [${maskedProxy}]...`);

        switch (platform) {
            case 'linkedin':
                return await this.scrapeLinkedIn(phrase, proxyUrl);
            case 'reddit':
                return await this.scrapeReddit(phrase, proxyUrl);
            case 'twitter':
                return await this.scrapeTwitter(phrase, proxyUrl);
            case 'threads':
                return await this.scrapeThreads(phrase, proxyUrl);
            default:
                throw new Error(`Platform "${platform}" not supported by HunterCrawler.`);
        }
    }

    /**
     * LinkedIn Search:
     * 1. If li_at cookie is present, scrapes live LinkedIn search results directly.
     * 2. If no cookie is present or if redirected to login, automatically falls back to Google SERP.
     */
    private static async scrapeLinkedIn(phrase: string, proxyUrl: string | null): Promise<NormalizedScrapedItem[]> {
        const liAt = await this.getLinkedInCookie();

        if (liAt) {
            try {
                console.log(`🎯 [HunterCrawler] Attempting authenticated LinkedIn search with li_at session cookie...`);
                const items = await this.scrapeLinkedInAuthenticated(phrase, liAt, proxyUrl);
                if (items.length > 0) return items;
                console.log(`🎯 [HunterCrawler] Authenticated search returned 0 items; falling back to Google search.`);
            } catch (err: any) {
                console.warn(`🎯 [HunterCrawler] Authenticated LinkedIn search failed: ${err.message}. Falling back to Google SERP.`);
            }
        }

        // Public Google SERP fallback (past 24h &tbs=qdr:d)
        const query = `site:linkedin.com/posts "${phrase}"`;
        return await this.scrapeGoogleSerp(query, 'linkedin', proxyUrl);
    }

    /**
     * Authenticated LinkedIn search via Playwright.
     */
    private static async scrapeLinkedInAuthenticated(
        phrase: string,
        liAt: string,
        proxyUrl: string | null
    ): Promise<NormalizedScrapedItem[]> {
        const items: NormalizedScrapedItem[] = [];
        const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(phrase)}&sortBy=%22date_posted%22`;

        const crawler = this.createCrawler(
            proxyUrl,
            async ({ page }) => {
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Check if redirected to login or authwall
                const currentUrl = page.url();
                if (currentUrl.includes('/checkpoint/') || currentUrl.includes('/login') || currentUrl.includes('/authwall')) {
                    throw new Error(`LinkedIn session expired or auth checkpoint hit (${currentUrl})`);
                }

                // Wait for content container or cards
                try {
                    await page.waitForSelector('.search-results-container, .feed-shared-update-v2, div[data-urn]', { timeout: 10000 });
                } catch {
                    // Page may have loaded empty or different selector
                }

                const postElements = await page.$$('.feed-shared-update-v2, div[data-urn]');

                for (const el of postElements.slice(0, 20)) {
                    try {
                        const content = (await el.$eval('.feed-shared-update-v2__description, .break-words, span.break-words', (node: any) => node.innerText).catch(() => '')) || '';
                        if (!content || content.trim().length < 15) continue;

                        const authorName = (await el.$eval('.update-components-actor__name, .app-aware-link span[aria-hidden="true"]', (node: any) => node.innerText).catch(() => '')) || '';
                        const authorUrl = (await el.$eval('a.update-components-actor__image, a[href*="/in/"]', (node: any) => node.href).catch(() => '')) || '';
                        const postUrl = (await el.$eval('a[href*="/feed/update/urn:li:activity:"]', (node: any) => node.href).catch(() => '')) || '';
                        const urn = (await el.getAttribute('data-urn').catch(() => '')) || '';

                        const id = urn || postUrl || `li_${Buffer.from(content.slice(0, 40)).toString('hex')}`;
                        const publicIdentifier = authorUrl.match(/\/in\/([^/?]+)/)?.[1];

                        items.push({
                            id,
                            url: postUrl || authorUrl || `https://www.linkedin.com/feed/`,
                            content: content.trim(),
                            platform: 'linkedin',
                            author: {
                                name: authorName.trim() || undefined,
                                handle: publicIdentifier || undefined,
                                url: authorUrl || undefined,
                                publicIdentifier: publicIdentifier || undefined,
                            },
                            postedAt: {
                                date: new Date().toISOString(),
                                timestamp: Date.now(),
                            },
                            engagement: {
                                likes: 0,
                                comments: 0,
                                shares: 0,
                            },
                            raw_result: { content, authorName, authorUrl, postUrl, urn },
                        });
                    } catch {
                        // ignore parsing error on individual card
                    }
                }
            },
            {
                cookies: [
                    {
                        name: 'li_at',
                        value: liAt,
                        domain: '.www.linkedin.com',
                        path: '/',
                    },
                    {
                        name: 'li_at',
                        value: liAt,
                        domain: '.linkedin.com',
                        path: '/',
                    },
                ],
            }
        );

        await crawler.run([searchUrl]);
        console.log(`🎯 [HunterCrawler] Extracted ${items.length} authenticated LinkedIn items.`);
        return items;
    }

    /**
     * Reddit Search: queries Google SERP or Reddit search.
     */
    private static async scrapeReddit(phrase: string, proxyUrl: string | null): Promise<NormalizedScrapedItem[]> {
        const query = `site:reddit.com "${phrase}"`;
        return await this.scrapeGoogleSerp(query, 'reddit', proxyUrl);
    }

    /**
     * Twitter Search: queries Google SERP.
     */
    private static async scrapeTwitter(phrase: string, proxyUrl: string | null): Promise<NormalizedScrapedItem[]> {
        const query = `(site:x.com OR site:twitter.com) "${phrase}"`;
        return await this.scrapeGoogleSerp(query, 'twitter', proxyUrl);
    }

    /**
     * Threads Search: queries Google SERP.
     */
    private static async scrapeThreads(phrase: string, proxyUrl: string | null): Promise<NormalizedScrapedItem[]> {
        const query = `site:threads.net "${phrase}"`;
        return await this.scrapeGoogleSerp(query, 'threads', proxyUrl);
    }

    /**
     * Scrapes Google Search results directly using Playwright with <50KB payload.
     * Enforces the past-24-hours filter (&tbs=qdr:d) to match freshness requirements.
     */
    private static async scrapeGoogleSerp(
        query: string,
        platform: string,
        proxyUrl: string | null
    ): Promise<NormalizedScrapedItem[]> {
        const items: NormalizedScrapedItem[] = [];
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=qdr:d&hl=en&num=25`;

        const crawler = this.createCrawler(proxyUrl, async ({ page }) => {
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Extract Google search result blocks
            const results = await page.$$eval(
                'div.g, div[data-sokoban-container], div.MjjYud',
                (nodes: any[]) => {
                    return nodes
                        .map((node) => {
                            const titleEl = node.querySelector('h3');
                            const linkEl = node.querySelector('a[href^="http"]');
                            const snippetEl = node.querySelector(
                                'div.VwiC3b, div[data-sncf="1"], div[style*="-webkit-line-clamp"]'
                            );

                            const href = linkEl ? linkEl.getAttribute('href') : '';
                            const title = titleEl ? titleEl.textContent : '';
                            const snippet = snippetEl ? snippetEl.textContent : '';

                            return { href, title, snippet };
                        })
                        .filter((item) => item.href && !item.href.includes('google.com'));
                }
            );

            for (const r of results) {
                const url = r.href;
                if (!url) continue;

                // Validate platform-specific domain
                if (platform === 'linkedin' && !url.includes('linkedin.com')) continue;
                if (platform === 'reddit' && !url.includes('reddit.com')) continue;
                if (platform === 'twitter' && !url.includes('x.com') && !url.includes('twitter.com')) continue;
                if (platform === 'threads' && !url.includes('threads.net')) continue;

                const fullContent = [r.title, r.snippet].filter(Boolean).join('\n\n').trim();
                if (fullContent.length < 15) continue;

                const postedAt = extractTimestampFromUrlOrSnippet(url, fullContent);

                // Extract author name from title if structured like "Name on Platform: '...'"
                let authorName: string | undefined;
                let handle: string | undefined;
                let publicIdentifier: string | undefined;

                if (platform === 'linkedin') {
                    const match = r.title.match(/^([^:|•\-]+)\s+(?:on LinkedIn|posts)/i);
                    if (match) authorName = match[1].trim();
                    const inMatch = url.match(/\/in\/([^/?]+)/);
                    if (inMatch) publicIdentifier = inMatch[1];
                } else if (platform === 'reddit') {
                    const match = url.match(/\/r\/([^/]+)\/comments\/([^/]+)/);
                    if (match) handle = `r/${match[1]}`;
                } else if (platform === 'twitter') {
                    const match = url.match(/(?:x|twitter)\.com\/([^/?]+)/);
                    if (match && !['home', 'explore', 'search'].includes(match[1])) {
                        handle = `@${match[1]}`;
                        authorName = match[1];
                    }
                }

                items.push({
                    id: url,
                    url,
                    content: fullContent,
                    platform,
                    author: {
                        name: authorName,
                        handle,
                        url: publicIdentifier ? `https://www.linkedin.com/in/${publicIdentifier}` : undefined,
                        publicIdentifier,
                    },
                    postedAt,
                    engagement: {
                        likes: 0,
                        comments: 0,
                        shares: 0,
                    },
                    raw_result: r,
                });
            }
        });

        await crawler.run([searchUrl]);
        console.log(`🎯 [HunterCrawler] Extracted ${items.length} ${platform} items from Google SERP.`);
        return items;
    }

    /**
     * Scrapes target influencer/creator profile recent activity.
     */
    public static async scrapeTargetProfile(target: any): Promise<NormalizedScrapedItem[]> {
        const proxyUrl = await this.getProxyUrl();
        const liAt = await this.getLinkedInCookie();

        console.log(`🎯 [HunterCrawler] Scraping target watchlist profile: "${target.name}" (${target.url})...`);

        if (target.platform === 'linkedin' && liAt) {
            try {
                const targetActivityUrl = `${target.url.replace(/\/$/, '')}/recent-activity/all/`;
                const items: NormalizedScrapedItem[] = [];

                const crawler = this.createCrawler(
                    proxyUrl,
                    async ({ page }) => {
                        await page.goto(targetActivityUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                        const currentUrl = page.url();
                        if (currentUrl.includes('/checkpoint/') || currentUrl.includes('/login')) {
                            throw new Error('LinkedIn session expired during profile crawl');
                        }

                        const postElements = await page.$$('.feed-shared-update-v2, div[data-urn]');
                        for (const el of postElements.slice(0, 10)) {
                            const content = (await el.$eval('.feed-shared-update-v2__description, .break-words, span.break-words', (node: any) => node.innerText).catch(() => '')) || '';
                            if (!content || content.trim().length < 15) continue;

                            const postUrl = (await el.$eval('a[href*="/feed/update/urn:li:activity:"]', (node: any) => node.href).catch(() => '')) || '';
                            const urn = (await el.getAttribute('data-urn').catch(() => '')) || '';

                            items.push({
                                id: urn || postUrl || `target_${Buffer.from(content.slice(0, 30)).toString('hex')}`,
                                url: postUrl || target.url,
                                content: content.trim(),
                                platform: 'linkedin',
                                author: {
                                    name: target.name,
                                    url: target.url,
                                },
                                postedAt: {
                                    date: new Date().toISOString(),
                                    timestamp: Date.now(),
                                },
                                engagement: {
                                    likes: 0,
                                    comments: 0,
                                    shares: 0,
                                },
                                raw_result: { content, postUrl, urn },
                            });
                        }
                    },
                    {
                        cookies: [
                            {
                                name: 'li_at',
                                value: liAt,
                                domain: '.linkedin.com',
                                path: '/',
                            },
                        ],
                    }
                );

                await crawler.run([targetActivityUrl]);
                if (items.length > 0) return items;
            } catch (err: any) {
                console.warn(`🎯 [HunterCrawler] Direct target profile scrape failed: ${err.message}. Falling back to Google.`);
            }
        }

        // Fallback: search for target's recent posts on Google
        const query = `site:linkedin.com "${target.name}"`;
        return await this.scrapeGoogleSerp(query, target.platform || 'linkedin', proxyUrl);
    }
}
