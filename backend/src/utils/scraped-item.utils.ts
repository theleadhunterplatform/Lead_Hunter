function pickString(...values: unknown[]): string {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

export function extractScrapedPostId(item: any, platform: string): string | null {
    return (
        item?.id ||
        item?.entityId ||
        item?.tweetId ||
        item?.postId ||
        item?.name ||
        (platform === 'linkedin' ? item?.id : null) ||
        null
    );
}

export function extractScrapedContent(item: any, platform: string): string {
    switch (platform) {
        case 'linkedin':
            return pickString(
                item?.content,
                item?.text,
                item?.commentary,
                item?.article?.title && item?.article?.description
                    ? `${item.article.title}\n${item.article.description}`
                    : '',
                item?.article?.title,
                item?.resharedPost?.content,
                item?.repost?.content
            );
        case 'twitter':
            return pickString(item?.text, item?.full_text, item?.fullText, item?.tweetText, item?.content);
        case 'reddit':
            return pickString(
                item?.body,
                item?.selftext,
                item?.text,
                item?.content,
                item?.title && item?.selftext ? `${item.title}\n${item.selftext}` : '',
                item?.title
            );
        case 'threads':
            return pickString(item?.text, item?.caption, item?.content, item?.postText);
        default:
            return pickString(item?.text, item?.content, item?.body);
    }
}

export function extractScrapedUrl(item: any, platform: string): string {
    switch (platform) {
        case 'linkedin':
            return pickString(item?.linkedinUrl, item?.url);
        case 'twitter':
            return pickString(item?.url, item?.tweetUrl, item?.twitterUrl);
        case 'reddit':
            return pickString(item?.url, item?.permalink);
        default:
            return pickString(item?.url);
    }
}

/**
 * Decodes precise publication timestamps from social platform snowflake IDs and snippet prefixes.
 * LinkedIn activity IDs and Twitter status IDs embed millisecond-accurate timestamps in their IDs.
 */
export function extractTimestampFromUrlOrSnippet(url?: string, _platform?: string, snippet?: string): { timestamp?: number; date?: string; postedAgoText?: string } {
    const rawUrl = (url || '').toString();

    // 1. LinkedIn Activity Snowflake ID (e.g. activity-7378326367752511488)
    const activityMatch = rawUrl.match(/activity-([0-9]{18,20})/) || rawUrl.match(/-([0-9]{18,20})(?:[/?#]|$)/);
    if (activityMatch) {
        try {
            const activityId = BigInt(activityMatch[1]);
            const ms = Number(activityId >> 22n);
            // Sanity check: between 2015 and now + 1 day
            if (ms > 1420070400000 && ms <= Date.now() + 86400000) {
                return {
                    timestamp: ms,
                    date: new Date(ms).toISOString(),
                };
            }
        } catch {
            // ignore BigInt error
        }
    }

    // 2. Twitter / X Snowflake ID (e.g. status/1234567890123456789)
    const tweetMatch = rawUrl.match(/status\/([0-9]{15,22})/);
    if (tweetMatch) {
        try {
            const tweetId = BigInt(tweetMatch[1]);
            const ms = Number((tweetId >> 22n) + 1288834974657n);
            if (ms > 1288834974657 && ms <= Date.now() + 86400000) {
                return {
                    timestamp: ms,
                    date: new Date(ms).toISOString(),
                };
            }
        } catch {
            // ignore
        }
    }

    // 3. Snippet date extraction (e.g. "Sep 29, 2025 — ", "2 days ago — ", "15 hours ago — ", "3 weeks ago — ")
    if (snippet && typeof snippet === 'string') {
        const relativeMatch = snippet.match(/^(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i);
        if (relativeMatch) {
            const count = parseInt(relativeMatch[1], 10);
            const unit = relativeMatch[2].toLowerCase();
            const multipliers: Record<string, number> = {
                minute: 60 * 1000,
                hour: 3600 * 1000,
                day: 86400 * 1000,
                week: 7 * 86400 * 1000,
                month: 30 * 86400 * 1000,
                year: 365 * 86400 * 1000,
            };
            const diff = count * (multipliers[unit] || 86400 * 1000);
            const ms = Date.now() - diff;
            return {
                timestamp: ms,
                date: new Date(ms).toISOString(),
                postedAgoText: `${count} ${unit}${count > 1 ? 's' : ''} ago`,
            };
        }

        const datePrefixMatch = snippet.match(/^([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s*[-—]/);
        if (datePrefixMatch) {
            const parsed = new Date(datePrefixMatch[1]).getTime();
            if (!isNaN(parsed) && parsed > 0) {
                return {
                    timestamp: parsed,
                    date: new Date(parsed).toISOString(),
                };
            }
        }
    }

    return {};
}

export function extractScrapedPostedAt(item: any, platform?: string): Record<string, any> {
    if (!item) return {};

    const url = item.url || item.permalink || item.link || item.postUrl || item.linkedinUrl || item.tweetUrl || '';
    const content = item.content || item.snippet || item.text || '';
    const snowflake = extractTimestampFromUrlOrSnippet(url, platform, content);

    // If snowflake timestamp was decoded directly from platform URL, it is authoritative
    if (snowflake.timestamp) {
        const diffHours = Math.max(0, (Date.now() - snowflake.timestamp) / (1000 * 60 * 60));
        let postedAgoShort: string;
        let postedAgoText: string;
        if (diffHours < 1) {
            const mins = Math.max(1, Math.floor(diffHours * 60));
            postedAgoShort = `${mins}m`;
            postedAgoText = `${mins} minutes ago`;
        } else if (diffHours < 24) {
            const hours = Math.floor(diffHours);
            postedAgoShort = `${hours}h`;
            postedAgoText = `${hours} hours ago`;
        } else {
            const days = Math.floor(diffHours / 24);
            postedAgoShort = `${days}d`;
            postedAgoText = `${days} days ago`;
        }
        return {
            date: snowflake.date,
            timestamp: snowflake.timestamp,
            postedAgoShort,
            postedAgoText,
        };
    }

    if (item.postedAt && typeof item.postedAt === 'object' && Object.keys(item.postedAt).length > 0) {
        return item.postedAt;
    }

    let dateStr = item.date || item.createdAt || item.created_at || item.publishedAt || item.published_at;
    let timestamp = typeof item.timestamp === 'number' ? item.timestamp : undefined;

    if (!timestamp && typeof item.created_utc === 'number') {
        timestamp = item.created_utc * 1000;
    } else if (!timestamp && typeof item.taken_at === 'number') {
        timestamp = item.taken_at * 1000;
    }

    if (!dateStr && timestamp) {
        dateStr = new Date(timestamp).toISOString();
    } else if (dateStr && !timestamp) {
        const parsed = new Date(dateStr).getTime();
        if (!isNaN(parsed)) timestamp = parsed;
    }

    let postedAgoShort: string | undefined;
    let postedAgoText: string | undefined;

    if (timestamp && !isNaN(timestamp)) {
        const diffHours = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
        if (diffHours < 1) {
            const mins = Math.max(1, Math.floor(diffHours * 60));
            postedAgoShort = `${mins}m`;
            postedAgoText = `${mins} minutes ago`;
        } else if (diffHours < 24) {
            const hours = Math.floor(diffHours);
            postedAgoShort = `${hours}h`;
            postedAgoText = `${hours} hours ago`;
        } else {
            const days = Math.floor(diffHours / 24);
            postedAgoShort = `${days}d`;
            postedAgoText = `${days} days ago`;
        }
    }

    return {
        ...(dateStr ? { date: dateStr } : {}),
        ...(timestamp ? { timestamp } : {}),
        ...(postedAgoShort ? { postedAgoShort } : {}),
        ...(postedAgoText ? { postedAgoText } : {}),
    };
}

/**
 * Checks if a scraped post is older than maxDays (default: 2 days / 48 hours).
 * Returns true if the post is strictly older than maxDays.
 */
export function isPostOlderThanDays(item: any, platform?: string, maxDays = 2): boolean {
    if (!item) return false;

    // 0. High-accuracy Snowflake verification from URL
    const url = item.url || item.permalink || item.link || item.postUrl || item.linkedinUrl || item.tweetUrl || '';
    const content = item.content || item.snippet || item.text || '';
    const snowflake = extractTimestampFromUrlOrSnippet(url, platform, content);
    if (snowflake.timestamp) {
        const hoursAgo = (Date.now() - snowflake.timestamp) / (1000 * 60 * 60);
        if (hoursAgo > maxDays * 24) {
            return true;
        }
    }

    const postedAt = item.postedAt && typeof item.postedAt === 'object' ? item.postedAt : item;

    // 1. Exact numeric timestamp
    const rawTimestamp =
        postedAt.timestamp ||
        item.timestamp ||
        (typeof item.created_utc === 'number' ? item.created_utc * 1000 : null) ||
        (typeof item.taken_at === 'number' ? item.taken_at * 1000 : null);

    if (typeof rawTimestamp === 'number' && !isNaN(rawTimestamp) && rawTimestamp > 0) {
        const tsMs = rawTimestamp < 1e11 ? rawTimestamp * 1000 : rawTimestamp;
        const hoursAgo = (Date.now() - tsMs) / (1000 * 60 * 60);
        return hoursAgo > maxDays * 24;
    }

    // 2. Exact date string
    const dateStr = postedAt.date || item.createdAt || item.created_at || item.date || item.publishedAt;
    if (typeof dateStr === 'string' && dateStr.trim()) {
        const parsed = new Date(dateStr).getTime();
        if (!isNaN(parsed) && parsed > 0) {
            const hoursAgo = (Date.now() - parsed) / (1000 * 60 * 60);
            return hoursAgo > maxDays * 24;
        }
    }

    // 3. Human-readable short string (e.g. '21h', '1d', '3d', '2w', '1mo')
    const agoShort = (postedAt.postedAgoShort || item.postedAgoShort || '').toString().trim().toLowerCase();
    if (agoShort) {
        if (/^\d+[mh]$/.test(agoShort)) {
            return false;
        }
        const dayMatch = agoShort.match(/^(\d+)d$/);
        if (dayMatch) {
            const days = parseInt(dayMatch[1], 10);
            return days > maxDays;
        }
        if (/[wmy]/.test(agoShort)) {
            return true;
        }
    }

    // 4. Human-readable text string (e.g. '3 days ago', '2 weeks ago')
    const agoText = (postedAt.postedAgoText || item.postedAgoText || '').toString().toLowerCase();
    if (agoText) {
        if (agoText.includes('minute') || agoText.includes('hour')) {
            return false;
        }
        const dayMatch = agoText.match(/(\d+)\s+day/);
        if (dayMatch) {
            const days = parseInt(dayMatch[1], 10);
            return days > maxDays;
        }
        if (agoText.includes('week') || agoText.includes('month') || agoText.includes('year')) {
            return true;
        }
    }

    return false;
}

export function extractScrapedEngagement(item: any, _platform?: string): { likes: number; comments: number; shares: number } {
    if (!item) return { likes: 0, comments: 0, shares: 0 };
    const likes = Number(
        item.numLikes ?? item.likes ?? item.favorite_count ?? item.reactionCount ?? item.likeCount ?? 0
    );
    const comments = Number(
        item.numComments ?? item.comments ?? item.reply_count ?? item.commentsCount ?? item.commentCount ?? 0
    );
    const shares = Number(
        item.numShares ?? item.shares ?? item.retweet_count ?? item.shareCount ?? 0
    );
    return {
        likes: isNaN(likes) ? 0 : likes,
        comments: isNaN(comments) ? 0 : comments,
        shares: isNaN(shares) ? 0 : shares,
    };
}
