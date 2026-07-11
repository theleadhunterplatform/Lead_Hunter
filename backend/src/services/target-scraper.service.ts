import prisma from '../lib/prisma';
import LeadPost from '../models/lead-post.model';
import config from '../config';
import { getApifyClient, handleApifyLimitError, recordApifyCommentUsage } from '../utils/apify-client.utils';
import { enqueueLeadQualification } from '../utils/qualification-queue.utils';
import { findExistingLeadPost, isDuplicateKeyError } from '../utils/lead-dedup.utils';

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
                console.log(
                    `⏭️ [TargetScraper] Skipping "${target.name}" — scraped ${hoursSince.toFixed(1)}h ago (min ${minHours}h)`
                );
                return { saved: 0, skipped: 0, deferred: true };
            }
        }

        const { client, activeKey } = await getApifyClient();
        let saved = 0;
        let skipped = 0;
        let commentsFound = 0;

        try {
            const run = await client.actor(config.apify.linkedinProfileCommentsActor).call({
                profiles: [target.url],
                maxItems: config.targetScraper.maxItems,
                postedLimit: config.targetScraper.postedLimit,
            });

            const result = await client.dataset(run.defaultDatasetId).listItems();
            const items = result.items as ProfileCommentItem[];
            commentsFound = items.length;

            console.log(`[TargetScraper] Found ${items.length} comments for "${target.name}"`);

            for (const item of items) {
                const wasSaved = await this.processCommentItem(item, target);
                if (wasSaved) saved++;
                else skipped++;
            }

            const month = new Date().toISOString().slice(0, 7);
            const resetMonthly = target.usage_month !== month;

            await prisma.sourceProfile.update({
                where: { id: target.id },
                data: {
                    last_scraped_at: new Date(),
                    last_comments_found: commentsFound,
                    usage_month: month,
                    monthly_comments_found: resetMonthly
                        ? commentsFound
                        : { increment: commentsFound },
                },
            });

            await recordApifyCommentUsage(activeKey, commentsFound);

            console.log(`✅ [TargetScraper] "${target.name}": ${saved} new posts, ${skipped} skipped`);
            return { saved, skipped };
        } catch (error: any) {
            await handleApifyLimitError(error, activeKey);
            console.error(`❌ [TargetScraper] Error for "${target.name}":`, error.message);
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
                keyword: `watchlist:${target.name}`,
                keyword_id: null,
                status: 'pending',
                source: 'scraped',
                source_type: 'profile_activity',
                source_profile: target.url,
                image_url: imageUrl,
                raw_result: {
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
            });

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
