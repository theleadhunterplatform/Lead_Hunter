import prisma from '../lib/prisma';
import LeadPost from '../models/lead-post.model';
import config from '../config';
import { getSetting } from './setting.service';
import { recordScrapeExecution } from '../utils/scraper-tool.utils';
import { getApifyClient, handleApifyLimitError, recordApifyCommentUsage } from '../utils/apify-client.utils';
import { enqueueLeadQualification } from '../utils/qualification-queue.utils';
import { findExistingLeadPost, isDuplicateKeyError } from '../utils/lead-dedup.utils';
import { isPostOlderThanDays } from '../utils/scraped-item.utils';
import { extractEmailFromText, extractPhoneFromText } from '../utils/lead-enrichment.utils';
import { ScrapedogScraperService, NormalizedScrapedItem } from './scrapedog-scraper.service';
import { CrawlbaseScraperService } from './crawlbase-scraper.service';

type ProfileCommentItem = {
    id?: string;
    postId?: string;
    commentary?: string;
    createdAt?: string;
    actor?: {
        name?: string;
        linkedinUrl?: string;
    };
    post?: {
        id?: string;
        linkedinUrl?: string;
        content?: string;
        author?: {
            name?: string;
            linkedinUrl?: string;
            publicIdentifier?: string;
            info?: string;
            website?: string | null;
        };
        postedAt?: {
            date?: string;
            timestamp?: number;
        };
        engagement?: {
            likes?: number;
            comments?: number;
            shares?: number;
        };
        postImages?: Array<{ url?: string }>;
    };
};

export class TargetScraperService {
    static async scrapeTargetProfile(targetId: string) {
        const target = await prisma.sourceProfile.findUnique({ where: { id: targetId } });
        if (!target) {
            throw new Error(`Target profile ${targetId} not found`);
        }

        if (!target.is_active) {
            console.log(`⏭️ [TargetScraper] Skipping inactive target: ${target.name}`);
            return { saved: 0, skipped: 0 };
        }

        if (target.platform !== 'linkedin') {
            throw new Error(`Platform "${target.platform}" is not supported for profile comment monitoring`);
        }

        console.log(`🚀 [TargetScraper] Scraping comments for watchlist target: "${target.name}" (${target.url})`);

        const minHours = config.targetScraper.minHoursBetweenScrapes;
        if (target.last_scraped_at && minHours > 0) {
            const hoursSince =
                (Date.now() - new Date(target.last_scraped_at).getTime()) / (1000 * 60 * 60);
            if (hoursSince < minHours) {
                const minLabel = minHours < 1 ? `${Math.round(minHours * 60)}m` : `${minHours}h`;
                const sinceLabel = hoursSince < 1 ? `${Math.round(hoursSince * 60)}m` : `${hoursSince.toFixed(1)}h`;
                console.log(
                    `⏭️ [TargetScraper] Skipping "${target.name}" — scraped ${sinceLabel} ago (min ${minLabel})`
                );
                return { saved: 0, skipped: 0, deferred: true };
            }
        }

        const engines = await this.resolveEnginePlan();
        if (engines.length === 0) {
            console.log(`⏸️ [TargetScraper] All scraper engines are paused, skipping watchlist target: ${target.name}`);
            return { saved: 0, skipped: 0, paused: true };
        }

        let saved = 0;
        let skipped = 0;
        let itemsFound = 0;
        let successEngine = '';
        const errors: string[] = [];

        for (const engine of engines) {
            try {
                if (engine === 'apify') {
                    console.log(`[TargetScraper] Scraping "${target.name}" via Apify...`);
                    const apifyRes = await this.scrapeWithApify(target);
                    saved = apifyRes.saved;
                    skipped = apifyRes.skipped;
                    itemsFound = apifyRes.itemsFound;
                    successEngine = 'apify';
                    break;
                } else if (engine === 'scrapedog') {
                    const isConfigured = await ScrapedogScraperService.isConfigured();
                    if (!isConfigured) continue;
                    console.log(`[TargetScraper] Scraping "${target.name}" via Scrapedog...`);
                    const items = await ScrapedogScraperService.scrapeTargetProfile(target);
                    for (const item of items) {
                        const wasSaved = await this.processNormalizedTargetItem(item, target, 'scrapedog');
                        if (wasSaved) saved++;
                        else skipped++;
                    }
                    itemsFound = items.length;
                    successEngine = 'scrapedog';
                    break;
                } else if (engine === 'crawlbase') {
                    const isConfigured = await CrawlbaseScraperService.isConfigured();
                    if (!isConfigured) continue;
                    console.log(`[TargetScraper] Scraping "${target.name}" via Crawlbase...`);
                    const items = await CrawlbaseScraperService.scrapeTargetProfile(target);
                    for (const item of items) {
                        const wasSaved = await this.processNormalizedTargetItem(item, target, 'crawlbase');
                        if (wasSaved) saved++;
                        else skipped++;
                    }
                    itemsFound = items.length;
                    successEngine = 'crawlbase';
                    break;
                }
            } catch (err: any) {
                console.warn(`[TargetScraper] Engine "${engine}" failed for "${target.name}":`, err.message);
                errors.push(`${engine}: ${err.message}`);
            }
        }

        if (!successEngine) {
            console.error(`❌ [TargetScraper] All configured engines failed for watchlist "${target.name}": ${errors.join('; ')}`);
            throw new Error(`All scraper engines failed for watchlist "${target.name}": ${errors.join('; ')}`);
        }

        const month = new Date().toISOString().slice(0, 7);
        const resetMonthly = target.usage_month !== month;

        await prisma.sourceProfile.update({
            where: { id: target.id },
            data: {
                last_scraped_at: new Date(),
                last_comments_found: itemsFound,
                usage_month: month,
                monthly_comments_found: resetMonthly
                    ? itemsFound
                    : { increment: itemsFound },
            },
        });

        await recordScrapeExecution(successEngine, 'linkedin-watchlist', target.name, saved, 'success');
        console.log(`✅ [TargetScraper] "${target.name}" (${successEngine}): ${saved} new posts, ${skipped} skipped`);
        return { saved, skipped, engine: successEngine };
    }

    private static async resolveEnginePlan(): Promise<string[]> {
        let primary = config.scraper?.primaryEngine || 'apify';
        let fallbacks = config.scraper?.fallbackEngines ? [...config.scraper.fallbackEngines] : ['scrapedog', 'crawlbase'];
        let paused: string[] = [];

        try {
            const dbPrimary = await getSetting('primary_scraper_engine');
            if (dbPrimary && typeof dbPrimary === 'string' && dbPrimary.trim()) {
                primary = dbPrimary.trim().toLowerCase();
            }
            const dbFallbacks = await getSetting('fallback_scraper_engines');
            if (Array.isArray(dbFallbacks) && dbFallbacks.length > 0) {
                fallbacks = dbFallbacks.map((f: any) => String(f).trim().toLowerCase()).filter(Boolean);
            }
            const dbPaused = await getSetting('paused_scraper_engines');
            if (Array.isArray(dbPaused)) {
                paused = dbPaused.map((p: any) => String(p).trim().toLowerCase()).filter(Boolean);
            }
        } catch {
            // keep config defaults
        }

        const plan = [primary, ...fallbacks.filter((f) => f !== primary)];
        const uniquePlan = Array.from(new Set(plan));
        return uniquePlan.filter((engine) => !paused.includes(engine));
    }

    private static async scrapeWithApify(
        target: { id: string; name: string; url: string; usage_month?: string | null }
    ): Promise<{ saved: number; skipped: number; itemsFound: number }> {
        const { client, activeKey } = await getApifyClient();
        let saved = 0;
        let skipped = 0;

        try {
            const run = await client.actor(config.apify.linkedinProfileCommentsActor).call({
                profiles: [target.url],
                maxItems: config.targetScraper.maxItems,
                postedLimit: config.targetScraper.postedLimit,
            });

            const result = await client.dataset(run.defaultDatasetId).listItems();
            const items = result.items as ProfileCommentItem[];

            for (const item of items) {
                const wasSaved = await this.processCommentItem(item, target);
                if (wasSaved) saved++;
                else skipped++;
            }

            await recordApifyCommentUsage(activeKey, items.length);
            return { saved, skipped, itemsFound: items.length };
        } catch (error: any) {
            await handleApifyLimitError(error, activeKey);
            throw error;
        }
    }

    private static async processNormalizedTargetItem(
        item: NormalizedScrapedItem,
        target: { id: string; name: string; url: string },
        engine: string
    ): Promise<boolean> {
        if (!item?.id) return false;

        // Age filter: skip posts older than 2 days (48 hours)
        if (isPostOlderThanDays(item, 'linkedin', 2)) {
            console.log(`⏭️ [TargetScraper] Skip ${item.id} for "${target.name}": older than 2 days`);
            return false;
        }

        if ((item.engagement?.comments || 0) > 100) {
            console.log(`⏭️ [TargetScraper] Skip ${item.id} for "${target.name}": oversaturated (${item.engagement?.comments} comments)`);
            return false;
        }

        const existingPost = await findExistingLeadPost({
            post_id: item.id,
            platform: 'linkedin',
            url: item.url,
            content: item.content,
        });
        if (existingPost) return false;

        const rawContent = item.content || '';
        const emailInContent = extractEmailFromText(rawContent);
        const phoneInContent = extractPhoneFromText(rawContent);

        try {
            const saved = await LeadPost.create({
                post_id: item.id,
                url: item.url || '',
                content: rawContent,
                platform: 'linkedin',
                author: item.author || {
                    name: target.name,
                    url: target.url,
                },
                posted_at: item.postedAt || {},
                engagement: item.engagement || { likes: 0, comments: 0, shares: 0 },
                email: emailInContent || undefined,
                phone: phoneInContent || undefined,
                email_source: emailInContent ? 'post_text' : undefined,
                phone_source: phoneInContent ? 'post_text' : undefined,
                email_status: emailInContent ? 'verified' : undefined,
                contact_info: {
                    scraper_engine: engine,
                    ...(emailInContent ? { emails: [{ email: emailInContent, source: 'post_text', status: 'verified' }] } : {}),
                    ...(phoneInContent ? { phone_numbers: [{ number: phoneInContent, source: 'post_text' }] } : {}),
                },
                enrichment_status: emailInContent || phoneInContent ? 'found' : undefined,
                keyword: `watchlist:${target.name}`,
                keyword_id: null,
                status: 'pending',
                source: 'scraped',
                scraper_engine: engine,
                source_type: 'profile_activity',
                source_profile: target.url,
                raw_result: {
                    _scraper_engine: engine,
                    post: item,
                    watchlist_target: {
                        id: target.id,
                        name: target.name,
                        url: target.url,
                    },
                },
            }, { throwOnDuplicate: true });

            if (saved?._id) {
                await enqueueLeadQualification(saved._id.toString());
            }

            console.log(`✨ [TargetScraper] New post from watchlist target "${target.name}" via ${engine}: ${item.id}`);
            return true;
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                return false;
            }
            throw error;
        }
    }

    private static async processCommentItem(
        item: ProfileCommentItem,
        target: { id: string; name: string; url: string }
    ): Promise<boolean> {
        const post = item.post;
        if (!post?.id) {
            return false;
        }

        // Age filter: skip posts older than 2 days (48 hours)
        if (isPostOlderThanDays(post, 'linkedin', 2)) {
            console.log(`⏭️ [TargetScraper] Skip post ${post.id} for "${target.name}": older than 2 days`);
            return false;
        }

        // Saturated post filter: Skip posts where competition is oversaturated (>100 comments)
        if ((post.engagement?.comments || 0) > 100) {
            console.log(`⏭️ [TargetScraper] Skip post ${post.id} for "${target.name}": oversaturated (${post.engagement?.comments} comments)`);
            return false;
        }

        const platform = 'linkedin';
        const existingPost = await findExistingLeadPost({
            post_id: post.id,
            platform,
            url: post.linkedinUrl,
            content: post.content,
        });
        if (existingPost) {
            return false;
        }

        const rawContent = post.content || '';
        const emailInContent = extractEmailFromText(rawContent);
        const phoneInContent = extractPhoneFromText(rawContent);
        const imageUrl = post.postImages?.[0]?.url || null;

        try {
            const saved = await LeadPost.create({
                post_id: post.id,
                url: post.linkedinUrl || '',
                content: post.content || '',
                platform,
                author: {
                    name: post.author?.name,
                    url: post.author?.linkedinUrl,
                    publicIdentifier: post.author?.publicIdentifier,
                    info: post.author?.info,
                    website: post.author?.website,
                },
                posted_at: post.postedAt || {},
                engagement: post.engagement || { likes: 0, comments: 0, shares: 0 },
                email: emailInContent || undefined,
                phone: phoneInContent || undefined,
                email_source: emailInContent ? 'post_text' : undefined,
                phone_source: phoneInContent ? 'post_text' : undefined,
                email_status: emailInContent ? 'verified' : undefined,
                contact_info: {
                    scraper_engine: 'apify',
                    ...(emailInContent ? { emails: [{ email: emailInContent, source: 'post_text', status: 'verified' }] } : {}),
                    ...(phoneInContent ? { phone_numbers: [{ number: phoneInContent, source: 'post_text' }] } : {}),
                },
                enrichment_status: emailInContent || phoneInContent ? 'found' : undefined,
                keyword: `watchlist:${target.name}`,
                keyword_id: null,
                status: 'pending',
                source: 'scraped',
                scraper_engine: 'apify',
                source_type: 'profile_activity',
                source_profile: target.url,
                image_url: imageUrl,
                raw_result: {
                    _scraper_engine: 'apify',
                    comment: {
                        id: item.id,
                        text: item.commentary,
                        createdAt: item.createdAt,
                        actor: item.actor,
                    },
                    post,
                    watchlist_target: {
                        id: target.id,
                        name: target.name,
                        url: target.url,
                    },
                },
            }, { throwOnDuplicate: true });

            if (saved?._id) {
                await enqueueLeadQualification(saved._id.toString());
            }

            console.log(`✨ [TargetScraper] New post from watchlist comment: ${post.id}`);
            return true;
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                return false;
            }
            throw error;
        }
    }
}
