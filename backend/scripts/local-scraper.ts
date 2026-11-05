import path from 'path';
import fs from 'fs';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import LeadPost from '../src/models/lead-post.model';
import { LinkedInVoyagerService } from '../src/services/linkedin-voyager.service';
import { findExistingLeadPost } from '../src/utils/lead-dedup.utils';

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

    const isHeadless = process.env.HEADLESS === 'true';
    if (!isHeadless) {
        console.log('🖥️ Running in visual Brave mode (bypasses Cloudflare anti-bot redirects). Set HEADLESS=true to run headless.');
    }

    const context = await chromium.launchPersistentContext(sessionDir, {
        executablePath: bravePath,
        headless: isHeadless,
        viewport: { width: 1280, height: 800 },
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
    });

    // Note: Persistent context already preserves cookies in sessionDir.
    // Injecting stale __cf_bm cookies causes Cloudflare ERR_TOO_MANY_REDIRECTS loop.

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
    let totalNew = 0;
    let totalUpdated = 0;
    let totalDupes = 0;

    for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        console.log(`\n============================================================`);
        console.log(`[${i + 1}/${targets.length}] Scraping: "${target.name}" (${target.url})`);
        console.log(`============================================================`);

        // 1. Try Direct Voyager API first (instant structured JSON, <20KB)
        try {
            console.log(`   ⚡ Trying Direct Voyager API for "${target.name}"...`);
            const voyagerItems = await LinkedInVoyagerService.scrapeTargetProfileComments(target);
            if (voyagerItems && voyagerItems.length > 0) {
                console.log(`   ✨ Voyager API returned ${voyagerItems.length} comment lead(s)!`);
                let savedCount = 0;
                for (const vItem of voyagerItems) {
                    try {
                        const saved = await LeadPost.create({
                            post_id: vItem.id,
                            url: vItem.url,
                            content: vItem.content,
                            platform: 'linkedin',
                            keyword: target.name,
                            source_type: 'watchlist',
                            source_profile: target.name,
                            author: vItem.author,
                            posted_at: vItem.postedAt,
                            engagement: { likes: 0, comments: 0, shares: 0 },
                            status: 'pending',
                        }, { throwOnDuplicate: false });
                        if (saved) savedCount++;
                    } catch (e: any) {
                        // ignore duplicate
                    }
                }
                console.log(`   ✅ [Voyager] Saved ${savedCount} fresh leads for "${target.name}".`);
                totalSaved += savedCount;
                totalProcessed++;
                continue; // Skip browser rendering for this target!
            }
        } catch (vErr: any) {
            console.log(`   ℹ️ Voyager API skipped for "${target.name}": ${vErr.message}. Falling back to browser.`);
        }

        const targetCommentsUrl = `${target.url.replace(/\/$/, '')}/recent-activity/comments/`;
        const targetAllUrl = `${target.url.replace(/\/$/, '')}/recent-activity/all/`;

        try {
            try {
                console.log(`   🎯 Scraping Comments activity: ${targetCommentsUrl}`);
                await page.goto(targetCommentsUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
            } catch (navErr: any) {
                console.log(`   ℹ️ Comments URL failed for "${target.name}": ${navErr?.message}. Falling back to /recent-activity/all/`);
                try {
                    await page.goto(targetAllUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
                } catch {
                    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
                }
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

                        // Check C: Search outerHTML for activity/share/ugcPost URNs
                        if (!postUrl) {
                            const html = (node as HTMLElement).outerHTML || '';
                            const match = html.match(/(?:activity|share|ugcPost)[%3A:_]+([0-9]{15,})/i);
                            if (match) {
                                const numId = match[1];
                                postId = numId;
                                postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${numId}/`;
                            }
                        }

                        // Check D: Any link inside the card pointing to feed/update, activity, or posts
                        if (!postUrl) {
                            const postAnchor = Array.from(node.querySelectorAll('a')).find(a => {
                                const h = a.getAttribute('href') || '';
                                return (h.includes('/feed/update/') || h.includes('/posts/') || h.includes('activity')) && !h.includes('/in/');
                            });
                            if (postAnchor) {
                                const rawHref = postAnchor.getAttribute('href') || '';
                                postUrl = rawHref.startsWith('http') ? rawHref.split('?')[0] : `https://www.linkedin.com${rawHref.split('?')[0]}`;
                            }
                        }

                        // Check E: Time description link
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

                        // If this is a comment pitch ("Hi Harsh Jain, ..."), extract the prospective client name
                        let prospectName = authorName;
                        const greetMatch = cleanContent.match(/\b(?:Hi|Hey|Hello|Dear)\s+([A-Za-z0-9_\s.()]{2,30}?)(?:,|\s+we\b|\s+I\b|\s+at\b|\s*!)/i);
                        if (greetMatch && greetMatch[1]) {
                            const candidate = greetMatch[1].trim();
                            if (candidate.length >= 3 && !/there|everyone|all|team/i.test(candidate)) {
                                prospectName = candidate;
                            }
                        }

                        results.push({
                            id: postId,
                            url: postUrl || (postId && /^[0-9]{15,}$/.test(postId) ? `https://www.linkedin.com/feed/update/urn:li:activity:${postId}/` : ''),
                            content: cleanContent,
                            timeStr: timeStr.trim(),
                            author: {
                                name: prospectName,
                                url: targetInfo.url,
                            }
                        });
                    }
                    return results;
                },
                { name: target.name, url: target.url }
            );

            console.log(`📥 [LocalScraper] Found ${extractedItems.length} candidate post(s) for "${target.name}"`);

            let newForTarget = 0;
            let updatedForTarget = 0;
            let dupesForTarget = 0;

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
