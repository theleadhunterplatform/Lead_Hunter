import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import LeadPost from '../src/models/lead-post.model';

const prisma = new PrismaClient();

function getBraveExecutable(): string | undefined {
    const candidates = [
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware/Brave-Browser/Application/brave.exe'),
    ];
    return candidates.find((p) => fs.existsSync(p));
}

function extractEmailFromText(text: string): string | null {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : null;
}

function extractPhoneFromText(text: string): string | null {
    const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return match ? match[0] : null;
}

function isWithin48Hours(timeStr: string): boolean {
    if (!timeStr) return true; // optimistic default
    const clean = timeStr.toLowerCase().trim();

    // Past 48 hours indicators
    if (/\b\d+\s*(?:mo|month|months|yr|year|years)\b/.test(clean)) return false;
    if (/\b\d+\s*(?:w|week|weeks)\b/.test(clean)) return false;

    // Check days: > 2d is > 48 hours
    const dayMatch = clean.match(/(\d+)\s*(?:d|day|days)/);
    if (dayMatch) {
        const days = parseInt(dayMatch[1], 10);
        return days <= 2;
    }

    // Minutes and hours are always < 48 hours
    if (/\b\d+\s*(?:m|min|minute|minutes|h|hr|hour|hours)\b/.test(clean)) return true;
    if (/just now|now|today|yesterday/i.test(clean)) return true;

    return true;
}

async function main() {
    const sessionDir = path.resolve(__dirname, '../.linkedin-session');
    const cookiesFile = path.join(sessionDir, 'cookies.json');
    const limit = parseInt(process.env.SCRAPE_LIMIT || '35', 10);

    if (!fs.existsSync(sessionDir)) {
        console.error('❌ [LocalScraper] No persistent browser session found at:', sessionDir);
        console.error('👉 Please run `npm run scrape:login` first to authenticate.');
        process.exit(1);
    }

    console.log('🚀 [LocalScraper] Starting local persistent scraper worker (Clean Post Pattern)...');
    console.log('🔒 Network: Direct residential connection (0 MB proxy cost, no proxy used)');
    console.log(`📁 Using persistent browser profile: ${sessionDir}`);

    const targets = await prisma.sourceProfile.findMany({
        where: {
            is_active: true,
            platform: 'linkedin',
        },
        orderBy: {
            last_scraped_at: 'asc',
        },
        take: limit,
    });

    if (targets.length === 0) {
        console.log('⚠️ [LocalScraper] No active LinkedIn watchlist targets found.');
        process.exit(0);
    }

    console.log(`📋 [LocalScraper] Processing ${targets.length} target(s)...\n`);

    const bravePath = getBraveExecutable();
    if (bravePath) {
        console.log(`🦁 Engine: Brave Browser (${bravePath})`);
    }

    const context = await chromium.launchPersistentContext(sessionDir, {
        executablePath: bravePath,
        headless: true,
        viewport: { width: 1280, height: 800 },
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
    });

    // Restore cached cookies if present
    if (fs.existsSync(cookiesFile)) {
        try {
            const saved = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));
            if (Array.isArray(saved) && saved.length > 0) {
                await context.addCookies(saved);
                console.log(`🔑 [LocalScraper] Injected ${saved.length} session cookies from disk.`);
            }
        } catch {
            // ignore
        }
    }

    // Resource blocking: abort media, fonts, websocket, telemetry
    await context.route('**/*', (route) => {
        const type = route.request().resourceType();
        const url = route.request().url().toLowerCase();
        if (
            ['image', 'media', 'font', 'websocket'].includes(type) ||
            /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot)(\?.*)?$/i.test(url) ||
            url.includes('/li/track') ||
            url.includes('/telemetry') ||
            url.includes('sentry.io') ||
            url.includes('doubleclick')
        ) {
            return route.abort();
        }
        return route.continue();
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    let totalProcessed = 0;
    let totalSaved = 0;

    for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        console.log(`\n============================================================`);
        console.log(`[${i + 1}/${targets.length}] Scraping: "${target.name}" (${target.url})`);
        console.log(`============================================================`);

        const targetActivityUrl = `${target.url.replace(/\/$/, '')}/recent-activity/all/`;

        try {
            try {
                await page.goto(targetActivityUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
            } catch (navErr: any) {
                if (navErr.message?.includes('ERR_TOO_MANY_REDIRECTS') || navErr.message?.includes('Timeout')) {
                    console.log(`   ℹ️ Activity URL redirected for "${target.name}". Falling back to profile base.`);
                    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
                } else {
                    throw navErr;
                }
            }

            await page.waitForTimeout(3000);

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
                        // 1. Skip system/footer noise
                        const fullText = (node as HTMLElement).innerText || '';
                        if (/visit our help center|manage your account and privacy|recommendation transparency|help us improve linkedin/i.test(fullText)) {
                            continue;
                        }

                        // 2. Extract timestamp string from card (e.g. "1mo", "1yr", "2d", "4h")
                        const timeEl = node.querySelector('.update-components-actor__sub-description, time, .feed-shared-actor__sub-description');
                        let timeStr = timeEl ? (timeEl as HTMLElement).innerText : '';
                        if (!timeStr) {
                            const timeMatch = fullText.match(/\b(\d+\s*(?:m|h|d|w|mo|yr))\b/);
                            timeStr = timeMatch ? timeMatch[1] : '';
                        }

                        // 3. Extract purely the clean post commentary
                        const commentaryEl = node.querySelector(
                            '.feed-shared-update-v2__description, .update-components-text, .feed-shared-inline-show-more-text, [data-ad-preview="message"]'
                        );

                        let cleanContent = commentaryEl ? (commentaryEl as HTMLElement).innerText.trim() : '';

                        // Strip the "Feed post Author • Headline [Time] [Follow]" header pattern
                        if (!cleanContent || cleanContent.length < 20) {
                            cleanContent = fullText;
                        }
                        cleanContent = cleanContent.replace(/^Feed\s+post\s+[\s\S]*?\b\d+\s*(?:m|h|d|w|mo|yr)\b\s*(?:Follow|Connect|Join|Following)?\s*/i, '').trim();

                        // Clean trailing noise like "… more", reaction counts
                        cleanContent = cleanContent
                            .replace(/…\s*more/gi, '')
                            .replace(/\b\d+\s*(?:reactions?|comments?|reposts?)\b/gi, '')
                            .trim();

                        if (!cleanContent || cleanContent.length < 30) continue;

                        const authorEl = node.querySelector('.update-components-actor__name, .app-aware-link span[aria-hidden="true"]');
                        const authorName = (authorEl ? (authorEl as HTMLElement).innerText : targetInfo.name || '').trim();

                        // 4. Resolve the EXACT direct post URL and post ID
                        let postUrl = '';
                        let postId = '';

                        // Check A: Links with update, activity, share, or targetUrn
                        const links = Array.from(node.querySelectorAll('a'));
                        for (const link of links) {
                            const href = link.getAttribute('href') || '';
                            if (href.includes('targetUrn=')) {
                                const m = href.match(/targetUrn=([^&]+)/);
                                if (m) {
                                    const decoded = decodeURIComponent(m[1]);
                                    postUrl = `https://www.linkedin.com/feed/update/${decoded}/`;
                                    break;
                                }
                            }
                            if (href.includes('/feed/update/urn:li:')) {
                                postUrl = href.startsWith('http') ? href.split('?')[0] : `https://www.linkedin.com${href.split('?')[0]}`;
                                break;
                            }
                            if (href.includes('/posts/')) {
                                postUrl = href.startsWith('http') ? href.split('?')[0] : `https://www.linkedin.com${href.split('?')[0]}`;
                                break;
                            }
                        }

                        // Check B: Look for data-urn or data-id attributes on the card or descendants
                        if (!postUrl) {
                            const urnEl = (node.matches('[data-urn], [data-id]') ? node : node.querySelector('[data-urn], [data-id]')) as HTMLElement | null;
                            const urn = urnEl?.getAttribute('data-urn') || urnEl?.getAttribute('data-id') || '';
                            if (urn && urn.startsWith('urn:li:')) {
                                postUrl = `https://www.linkedin.com/feed/update/${urn}/`;
                            }
                        }

                        // Check C: Search outerHTML for urn:li:(share|activity|ugcPost):[0-9]+
                        if (!postUrl) {
                            const html = (node as HTMLElement).outerHTML || '';
                            const match = html.match(/(?:urn%3Ali%3A|urn:li:)(activity|share|ugcPost)(?:%3A|:)+([0-9]{15,})/i);
                            if (match) {
                                const type = match[1];
                                const numId = match[2];
                                postId = numId;
                                postUrl = `https://www.linkedin.com/feed/update/urn:li:${type}:${numId}/`;
                            }
                        }

                        // Check D: Time description link
                        if (!postUrl) {
                            const timeLink = node.querySelector('.update-components-actor__sub-description a, .feed-shared-actor__sub-description a, a.app-aware-link[href*="update"]') as HTMLAnchorElement | null;
                            if (timeLink && timeLink.href) {
                                postUrl = timeLink.href.split('?')[0];
                            }
                        }

                        // Extract post ID
                        if (!postId && postUrl) {
                            const m = postUrl.match(/(?:activity|share|ugcPost)?:?([0-9]{15,})/);
                            if (m) postId = m[1];
                        }
                        if (!postId) {
                            postId = `li_${cleanContent.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '')}`;
                        }

                        results.push({
                            id: postId,
                            url: postUrl || targetInfo.url,
                            content: cleanContent,
                            timeStr: timeStr.trim(),
                            author: {
                                name: authorName,
                                url: targetInfo.url,
                            }
                        });
                    }
                    return results;
                },
                { name: target.name, url: target.url }
            );

            console.log(`📥 [LocalScraper] Found ${extractedItems.length} candidate post(s) for "${target.name}"`);

            let savedForTarget = 0;
            for (const item of extractedItems) {
                // Strict 48-Hour Age Gate
                if (!isWithin48Hours(item.timeStr)) {
                    console.log(`   ⏭️ [Age Gate] Skipping post ${item.id} (${item.timeStr || 'unknown age'} > 48h)`);
                    continue;
                }

                const rawContent = item.content || '';
                const email = extractEmailFromText(rawContent);
                const phone = extractPhoneFromText(rawContent);

                try {
                    const saved = await LeadPost.create({
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
                    });

                    if (saved) {
                        console.log(`   💾 [Fresh Lead <48h] Post URL: ${item.url}`);
                        console.log(`      "${rawContent.slice(0, 70).replace(/\n/g, ' ')}..."`);
                        savedForTarget++;
                    }
                } catch (saveErr: any) {
                    if (saveErr.code === 'P2002' || saveErr.message?.includes('Unique constraint')) {
                        console.log(`   ℹ️ [Dedup] Post ${item.id} already exists in database.`);
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
                    last_comments_found: savedForTarget,
                },
            });

            console.log(`✅ [LocalScraper] Finished "${target.name}": saved ${savedForTarget} fresh lead(s).`);
            totalProcessed++;
            totalSaved += savedForTarget;

            // Polite delay between profiles (5-9s jitter)
            const pauseMs = 5000 + Math.floor(Math.random() * 4000);
            console.log(`⏳ Pausing ${Math.round(pauseMs / 1000)}s before next profile...`);
            await page.waitForTimeout(pauseMs);

        } catch (targetErr: any) {
            console.error(`❌ [LocalScraper] Error scraping "${target.name}":`, targetErr.message);
        }
    }

    await context.close();
    await prisma.$disconnect();

    console.log(`\n============================================================`);
    console.log(`🎉 [LocalScraper Complete] Processed: ${totalProcessed} profiles | Fresh Leads Saved: ${totalSaved}`);
    console.log(`============================================================\n`);
}

main().catch(async (e) => {
    console.error('💥 Fatal scraper failure:', e);
    await prisma.$disconnect();
    process.exit(1);
});
