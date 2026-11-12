import { extractEmailFromText, extractPhoneFromText } from '../src/utils/lead-enrichment.utils';
import path from 'path';
import fs from 'fs';
import { chromium, Browser, BrowserContext } from 'playwright';
import prisma from '../src/lib/prisma';
import LeadPost from '../src/models/lead-post.model';
import { findExistingLeadPost } from '../src/utils/lead-dedup.utils';

// Singleton prisma imported from src/lib/prisma

function getBraveExecutable(): string | undefined {
    const candidates = [
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware/Brave-Browser/Application/brave.exe'),
    ];
    return candidates.find((p) => fs.existsSync(p));
}



function isWithinDays(timeStr: string, maxDays = 4): boolean {
    if (!timeStr) return true; // optimistic default
    const clean = timeStr.toLowerCase().trim();

    // Past months / years indicators
    if (/\b\d+\s*(?:mo|month|months|yr|year|years)\b/.test(clean)) return false;
    if (/\b\d+\s*(?:w|week|weeks)\b/.test(clean)) return false;

    // Check days: <= maxDays (default 4 days)
    const dayMatch = clean.match(/(\d+)\s*(?:d|day|days)/);
    if (dayMatch) {
        const days = parseInt(dayMatch[1], 10);
        return days <= maxDays;
    }

    // Minutes and hours are always < 4 days
    if (/\b\d+\s*(?:m|min|minute|minutes|h|hr|hour|hours)\b/.test(clean)) return true;
    if (/just now|now|today|yesterday/i.test(clean)) return true;

    return true;
}

function parseCliArgs() {
    const args = process.argv.slice(2);
    let accountNum = 1;
    let customProxy: string | undefined = undefined;
    let brightdataWs: string | undefined = undefined;

    for (const arg of args) {
        if (arg.startsWith('--account=')) {
            const num = parseInt(arg.split('=')[1], 10);
            if (!isNaN(num) && num >= 1 && num <= 10) {
                accountNum = num;
            }
        } else if (arg.startsWith('--proxy=')) {
            customProxy = arg.split('=')[1].replace(/^["']|["']$/g, '').trim();
        } else if (arg.startsWith('--brightdata=')) {
            brightdataWs = arg.split('=')[1].replace(/^["']|["']$/g, '').trim();
        } else if (arg === '--brightdata') {
            brightdataWs = process.env.BRIGHTDATA_BROWSER_WS || process.env.BRIGHTDATA_URL || '';
        }
    }

    if (!brightdataWs && (process.env.BRIGHTDATA_BROWSER_WS || process.env.BRIGHTDATA_URL)) {
        brightdataWs = (process.env.BRIGHTDATA_BROWSER_WS || process.env.BRIGHTDATA_URL || '').trim();
    }

    return { accountNum, customProxy, brightdataWs };
}

async function main() {
    const { accountNum, customProxy, brightdataWs } = parseCliArgs();
    const wolfId = `wolf_${accountNum}`;
    const isBrightData = Boolean(brightdataWs);

    // Resolve isolated session profile
    const multiSessionDir = path.resolve(__dirname, `../.linkedin-sessions/account-${accountNum}`);
    const legacySessionDir = path.resolve(__dirname, '../.linkedin-session');
    const sessionDir = fs.existsSync(multiSessionDir) ? multiSessionDir : legacySessionDir;
    const limit = parseInt(process.env.SCRAPE_LIMIT || '35', 10);

    if (!isBrightData && !fs.existsSync(sessionDir)) {
        console.error(`❌ [Wolfpack Scraper] No session profile found for Account #${accountNum} at:`, sessionDir);
        console.error(`👉 Run 'npm run login:wolf -- --account=${accountNum}' first to authenticate.`);
        process.exit(1);
    }

    console.log(`\n🐺 ============================================================`);
    console.log(`🐺 WOLFPACK CRAWLER ACTIVE — ACCOUNT #${accountNum} (${wolfId})`);
    console.log(`🐺 ============================================================`);
    console.log(`📁 Browser profile: ${sessionDir}`);

    const allTargets = await prisma.sourceProfile.findMany({
        where: {
            is_active: true,
            platform: 'linkedin',
        },
        orderBy: {
            last_scraped_at: 'asc',
        },
        take: limit,
    });

    if (allTargets.length === 0) {
        console.log('⚠️ [Wolfpack Scraper] No active LinkedIn watchlist targets found.');
        process.exit(0);
    }

    // Partition targets: 7 per account (35 total targets / 5 accounts)
    const batchSize = Math.max(1, Math.ceil(allTargets.length / 5));
    const startIdx = (accountNum - 1) * batchSize;
    const endIdx = startIdx + batchSize;
    const targets = process.argv.some(a => a.startsWith('--account='))
        ? allTargets.slice(startIdx, endIdx)
        : allTargets;

    console.log(`📋 [Wolfpack Scraper] Targets assigned to Account #${accountNum}: ${targets.length} of ${allTargets.length} total targets.`);
    targets.forEach((t, i) => console.log(`   ${i + 1}. ${t.name || t.url}`));
    console.log('');

    const bravePath = getBraveExecutable();
    if (bravePath) {
        console.log(`🦁 Engine: Brave Browser (${bravePath})`);
    }

    const isHeadless = process.env.HEADLESS === 'true';
    if (!isHeadless) {
        console.log('🖥️ Running in visual Brave mode. Set HEADLESS=true to run headless.');
    }

    const useProxy = process.argv.includes('--proxy') || Boolean(customProxy) || process.env.SCRAPER_WITH_PROXY === 'true';
    const proxyUrl = customProxy || process.env.HUNTER_CRAWLER_PROXY_URL;
    let proxyOption: any = undefined;
    if (useProxy && proxyUrl) {
        try {
            const parsed = new URL(proxyUrl);
            let username = decodeURIComponent(parsed.username);
            // Only convert to sticky session if rotating token syntax is present
            if (username.includes('-rotate')) {
                username = username.replace('-rotate', `-session-wolf${accountNum}`);
            }
            proxyOption = {
                server: `${parsed.protocol}//${parsed.host}`,
                username,
                password: decodeURIComponent(parsed.password),
            };
            console.log(`🔒 Proxy: Sticky Residential active (${parsed.host}) [session: wolf${accountNum}]`);
        } catch {
            console.warn(`⚠️ Invalid proxy URL: ${proxyUrl}. Running direct.`);
        }
    } else {
        console.log('⚡ Direct Connection (Fast, matches authenticated burner session). Pass --proxy to route via Webshare.');
    }

    let browser: Browser | null = null;
    let context: BrowserContext;

    if (isBrightData) {
        const maskedWs = (brightdataWs || '').replace(/:[^:@]+@/, ':****@');
        console.log(`🌐 [Bright Data Scraping Browser] Connecting via CDP: ${maskedWs}`);
        browser = await chromium.connectOverCDP(brightdataWs!);
        context = browser.contexts()[0] || await browser.newContext({
            viewport: { width: 1280, height: 800 },
        });

        // Resolve and inject session cookies into Bright Data browser
        const cookiesToInject: any[] = [];
        const cookiesFile = path.join(sessionDir, 'cookies.json');
        if (fs.existsSync(cookiesFile)) {
            try {
                const diskCookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));
                if (Array.isArray(diskCookies)) cookiesToInject.push(...diskCookies);
            } catch {}
        }

        if (cookiesToInject.length === 0) {
            try {
                const wolfSetting = await prisma.setting.findUnique({ where: { key: 'wolfpack_accounts' } });
                if (wolfSetting && Array.isArray(wolfSetting.value)) {
                    const acc = (wolfSetting.value as any[]).find((w: any) => w.account_num === accountNum && w.li_at);
                    if (acc?.li_at) {
                        cookiesToInject.push(
                            { name: 'li_at', value: acc.li_at, domain: '.linkedin.com', path: '/', secure: true, httpOnly: true },
                            { name: 'JSESSIONID', value: acc.jsessionid || 'ajax:fake', domain: '.linkedin.com', path: '/', secure: true }
                        );
                    }
                }
            } catch {}
        }

        if (cookiesToInject.length === 0) {
            const envLiAt = (process.env.LINKEDIN_LI_AT || process.env.LINKEDIN_COOKIE || '').trim();
            if (envLiAt) {
                cookiesToInject.push({
                    name: 'li_at',
                    value: envLiAt,
                    domain: '.linkedin.com',
                    path: '/',
                    secure: true,
                    httpOnly: true,
                });
            }
        }

        if (cookiesToInject.length > 0) {
            await context.addCookies(cookiesToInject);
            console.log(`🍪 [Bright Data] Injected ${cookiesToInject.length} session cookies.`);
        } else {
            console.warn(`⚠️ [Bright Data] No li_at cookie found! Make sure you are logged in or set LINKEDIN_COOKIE.`);
        }
    } else {
        context = await chromium.launchPersistentContext(sessionDir, {
            executablePath: bravePath,
            headless: isHeadless,
            proxy: proxyOption,
            viewport: { width: 1280, height: 800 },
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--disable-dev-shm-usage',
            ],
        });

        if (proxyOption?.username && proxyOption?.password) {
            await context.setHTTPCredentials({
                username: proxyOption.username,
                password: proxyOption.password,
            });
        }
    }

    // Anti-bot stealth evasions: Strip navigator.webdriver and automation indicators
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
        (window as any).chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {},
        };
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission } as any) :
                originalQuery(parameters)
        );
    });

    // Note: Persistent context already preserves cookies in sessionDir.
    // Injecting stale __cf_bm cookies causes Cloudflare ERR_TOO_MANY_REDIRECTS loop.

    // High-Efficiency Asset Blocking: abort images, media, fonts, tracking, video ads to cap bandwidth < 300KB/page
    await context.route('**/*', (route) => {
        const type = route.request().resourceType();
        const url = route.request().url().toLowerCase();
        if (
            ['image', 'media', 'font', 'websocket'].includes(type) ||
            /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm|avi)(\?.*)?$/i.test(url) ||
            url.includes('/li/track') ||
            url.includes('/telemetry') ||
            url.includes('/realtime/') ||
            url.includes('sentry.io') ||
            url.includes('doubleclick') ||
            url.includes('google-analytics') ||
            url.includes('adservice') ||
            url.includes('quantserve') ||
            url.includes('scorecardresearch')
        ) {
            return route.abort();
        }
        return route.continue();
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    let totalProcessed = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let totalDupes = 0;

    for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        console.log(`\n============================================================`);
        console.log(`[${i + 1}/${targets.length}] Scraping: "${target.name}" (${target.url})`);
        console.log(`============================================================`);

        const cleanBaseUrl = target.url.replace(/\/$/, '');
        const targetSlug = cleanBaseUrl.split('/in/')[1]?.split('/')[0] || '';
        const targetCommentsUrl = `${cleanBaseUrl}/recent-activity/comments/`;
        const targetAllUrl = `${cleanBaseUrl}/recent-activity/all/`;

        try {
            console.log(`   🎯 Scraping Comments Activity: ${targetCommentsUrl}`);
            try {
                await page.goto(targetCommentsUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
            } catch (navErr: any) {
                console.log(`   ℹ️ Comments activity failed for "${target.name}": ${navErr?.message}. Falling back to /recent-activity/all/...`);
                await page.goto(targetAllUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
            }

            await page.waitForTimeout(3000);
            await page.evaluate(() => window.scrollBy(0, 600)).catch(() => null);
            await page.waitForTimeout(1500);

            // Handle GDPR cookie consent overlay if present
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const consentBtn = buttons.find(b => /accept|agree|reject/i.test(b.textContent || ''));
                if (consentBtn) (consentBtn as HTMLButtonElement).click();
            }).catch(() => null);

            // Extract posts with clean text, timestamp parsing, and direct post link
            const extractedItems = await page.$$eval(
                '[role="listitem"], .feed-shared-update-v2',
                (nodes, targetInfo) => {
                    const results: any[] = [];
                    for (const node of nodes) {
                        const fullText = (node as HTMLElement).innerText || '';
                        if (/visit our help center|manage your account and privacy|recommendation transparency|help us improve linkedin/i.test(fullText)) {
                            continue;
                        }

                        // Must be a post card or comment card
                        if (!fullText.includes('Feed post') && !node.classList.contains('feed-shared-update-v2')) {
                            continue;
                        }

                        const isComment = fullText.toLowerCase().includes('commented') || fullText.toLowerCase().includes('replied');

                        // 1. Extract the actual prospect (author of the original post being commented on)
                        const allProfileLinks = Array.from(node.querySelectorAll('a[href*="/in/"]')) as HTMLAnchorElement[];
                        const prospectAnchor = allProfileLinks.find(a => {
                            const href = a.getAttribute('href') || '';
                            return !href.includes(targetInfo.slug) && (a.innerText || '').trim().length > 2;
                        });
                        const prospectUrl = prospectAnchor ? prospectAnchor.href.split('?')[0] : '';
                        let prospectName = prospectAnchor ? (prospectAnchor.innerText || '').split('\n')[0].replace(/•.*$/, '').trim() : '';

                        // 2. Extract timestamp string from card (e.g. "12h", "1d", "2d", "1w")
                        const timeMatch = fullText.match(/\b(\d+\s*(?:m|h|d|w|mo|yr))\b/);
                        const timeStr = timeMatch ? timeMatch[1] : '';

                        // 3. Extract purely the buyer's original post content
                        let cleanContent = fullText;
                        if (isComment) {
                            cleanContent = cleanContent.replace(/^Feed\s+post\s+[\s\S]*?commented\s*/i, '');
                        } else {
                            cleanContent = cleanContent.replace(/^Feed\s+post\s+/i, '');
                        }
                        cleanContent = cleanContent.replace(/^[\s\S]*?\b\d+\s*(?:m|h|d|w|mo|yr)\b\s*(?:Follow|Connect|Join|Following)?\s*/i, '');
                        cleanContent = cleanContent.replace(/\b\d+\s*(?:reactions?|comments?|reposts?)\b[\s\S]*$/gi, '').trim();

                        if (!cleanContent || cleanContent.length < 25) continue;

                        // 4. Resolve direct post URL and post ID
                        let postUrl = '';
                        let postId = '';

                        // Check A: Look for post permalink in anchors
                        const postAnchor = Array.from(node.querySelectorAll('a')).find(a => {
                            const href = a.getAttribute('href') || '';
                            return (href.includes('/feed/update/') || href.includes('/posts/')) && !href.includes('/in/');
                        });
                        if (postAnchor) {
                            postUrl = postAnchor.href.split('?')[0];
                        }

                        // Check B: Look for URNs in HTML
                        const html = (node as HTMLElement).outerHTML || '';
                        const urnMatch = html.match(/(?:activity|share|ugcPost)[%3A:_]+([0-9]{15,})/i);
                        if (urnMatch) {
                            postId = urnMatch[1];
                            if (!postUrl) {
                                postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${postId}/`;
                            }
                        }

                        if (!postId && postUrl) {
                            const m = postUrl.match(/(?:activity|share|ugcPost)?:?([0-9]{15,})/);
                            if (m) postId = m[1];
                        }
                        if (!postId) {
                            postId = `li_${cleanContent.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '')}`;
                        }

                        // Fallback author if prospect not detected
                        if (!prospectName) {
                            prospectName = targetInfo.name;
                        }

                        results.push({
                            id: postId,
                            url: postUrl || prospectUrl || targetInfo.url,
                            content: cleanContent,
                            timeStr: timeStr.trim(),
                            author: {
                                name: prospectName,
                                url: prospectUrl || targetInfo.url,
                            },
                        });
                    }
                    return results;
                },
                { name: target.name, url: target.url, slug: targetSlug }
            );

            console.log(`📥 [LocalScraper] Found ${extractedItems.length} candidate post(s) for "${target.name}"`);

            let newForTarget = 0;
            let updatedForTarget = 0;
            let dupesForTarget = 0;

            for (const item of extractedItems) {
                // 4-Day Age Gate
                if (!isWithinDays(item.timeStr, 4)) {
                    console.log(`   ⏭️ [Age Gate] Skipping post ${item.id} (${item.timeStr || 'unknown age'} > 4d)`);
                    continue;
                }

                const rawContent = item.content || '';
                const email = extractEmailFromText(rawContent);
                const phone = extractPhoneFromText(rawContent);

                try {
                    // Check if lead already exists in DB
                    const existing = await findExistingLeadPost({
                        post_id: item.id,
                        platform: 'linkedin',
                        url: item.url,
                        content: rawContent,
                        email: email || undefined,
                        phone: phone || undefined,
                    });

                    if (existing) {
                        const existingUrl = existing.url || '';
                        const needsUrlUpdate = Boolean(item.url && item.url.startsWith('http') && (!existingUrl || existingUrl.includes('/in/')));
                        const existingAuthorName = (existing.author as any)?.name || '';
                        const needsAuthorUpdate = Boolean(item.author?.name && item.author.name !== existingAuthorName && item.author.name !== target.name);

                        if (needsUrlUpdate || needsAuthorUpdate) {
                            await prisma.leadPost.update({
                                where: { id: existing.id },
                                data: {
                                    ...(needsUrlUpdate ? { url: item.url } : {}),
                                    ...(needsAuthorUpdate ? { author: item.author } : {}),
                                },
                            });
                            console.log(`   🔄 [Updated Lead ${existing.id.slice(0, 8)}] Post URL: ${item.url || existingUrl} | Author: ${item.author?.name || existingAuthorName}`);
                            updatedForTarget++;
                        } else {
                            console.log(`   ℹ️ [Duplicate Skipped] Post ${item.id} already exists & up-to-date.`);
                            dupesForTarget++;
                        }
                    } else {
                        await prisma.leadPost.create({
                            data: {
                                post_id: item.id,
                                url: item.url || '',
                                content: rawContent,
                                platform: 'linkedin',
                                keyword: target.name,
                                source_type: 'watchlist',
                                source_profile: target.name,
                                author: item.author,
                                posted_at: {
                                    date: new Date().toISOString(),
                                    timestamp: Date.now(),
                                    relative: item.timeStr,
                                },
                                engagement: { likes: 0, comments: 0, shares: 0 },
                                email: email || undefined,
                                phone: phone || undefined,
                                status: 'pending',
                                review_status: 'awaiting_review',
                            },
                        });

                        console.log(`   ✨ [New Lead Saved] Post URL: ${item.url}`);
                        console.log(`      "${rawContent.slice(0, 70).replace(/\n/g, ' ')}..."`);
                        newForTarget++;
                    }
                } catch (saveErr: any) {
                    if (saveErr.code === 'P2002' || saveErr.message?.includes('Unique constraint')) {
                        console.log(`   ℹ️ [Dedup] Post ${item.id} unique constraint match.`);
                        dupesForTarget++;
                    } else {
                        console.warn(`   ⚠️ [Save Error] Post ${item.id}:`, saveErr.message);
                    }
                }
            }

            // Update watchlist last_scraped_at timestamp
            await prisma.sourceProfile.update({
                where: { id: target.id },
                data: {
                    last_scraped_at: new Date(),
                    last_comments_found: newForTarget + updatedForTarget,
                },
            });

            console.log(`✅ [LocalScraper] Finished "${target.name}": ${newForTarget} new, ${updatedForTarget} updated, ${dupesForTarget} dupes.`);
            totalProcessed++;
            totalNew += newForTarget;
            totalUpdated += updatedForTarget;
            totalDupes += dupesForTarget;

            // Humanized delay between profiles (8-15s jitter to avoid velocity flags)
            const pauseMs = 8000 + Math.floor(Math.random() * 7000);
            console.log(`⏳ Pausing ${Math.round(pauseMs / 1000)}s before next profile...`);
            await page.waitForTimeout(pauseMs);

        } catch (targetErr: any) {
            console.error(`❌ [LocalScraper] Error scraping "${target.name}":`, targetErr.message);
        }
    }

    await context.close().catch(() => null);
    if (browser) {
        await browser.close().catch(() => null);
    }
    await prisma.$disconnect();

    console.log(`\n============================================================`);
    console.log(`🎉 [LocalScraper Complete] Processed: ${totalProcessed} profiles`);
    console.log(`   ✨ Brand New Leads Saved:   ${totalNew}`);
    console.log(`   🔄 Existing Leads Updated:  ${totalUpdated}`);
    console.log(`   ⏭️  Duplicates Filtered Out: ${totalDupes}`);
    console.log(`============================================================\n`);
}

main().catch(async (e) => {
    console.error('💥 Fatal scraper failure:', e);
    await prisma.$disconnect();
    process.exit(1);
});
