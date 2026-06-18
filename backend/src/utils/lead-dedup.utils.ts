import prisma from '../lib/prisma';
import LeadPost from '../models/lead-post.model';

export function extractLinkedInActivityId(url?: string | null): string | null {
    if (!url) return null;
    const activity = url.match(/urn:li:activity:(\d+)/i);
    if (activity) return activity[1];
    const share = url.match(/urn:li:share:(\d+)/i);
    if (share) return share[1];
    return null;
}

export function getLeadDedupKey(lead: {
    platform: string;
    post_id: string;
    url: string;
    content: string;
}): string {
    const activityId = extractLinkedInActivityId(lead.url);
    if (activityId) {
        return `${lead.platform}:activity:${activityId}`;
    }

    const url = lead.url?.trim();
    if (url && url !== '#' && !url.startsWith('manual://')) {
        return `${lead.platform}:url:${url.toLowerCase()}`;
    }

    const content = lead.content?.trim();
    if (content && content.length >= 40) {
        return `${lead.platform}:content:${content}`;
    }

    return `${lead.platform}:post_id:${lead.post_id}`;
}

export async function findExistingLeadPost(options: {
    post_id?: string;
    platform: string;
    url?: string | null;
    content?: string | null;
}) {
    const { post_id, platform, url, content } = options;
    const base = { platform, is_deleted: false };

    if (post_id) {
        const byId = await LeadPost.findOne({ ...base, post_id });
        if (byId) return byId;
    }

    const activityId = extractLinkedInActivityId(url);
    if (activityId) {
        const byActivity = await prisma.leadPost.findFirst({
            where: {
                ...base,
                url: { contains: `activity:${activityId}` },
            },
        });
        if (byActivity) return byActivity;
    }

    const normalizedUrl = url?.trim();
    if (normalizedUrl && normalizedUrl !== '#' && !normalizedUrl.startsWith('manual://')) {
        const byUrl = await prisma.leadPost.findFirst({
            where: { ...base, url: normalizedUrl },
        });
        if (byUrl) return byUrl;
    }

    const trimmedContent = content?.trim();
    if (trimmedContent && trimmedContent.length >= 40) {
        const byContent = await prisma.leadPost.findFirst({
            where: { ...base, content: trimmedContent },
        });
        if (byContent) return byContent;
    }

    return null;
}

export function isDuplicateKeyError(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
    );
}

function scoreLeadForKeep(lead: {
    id: string;
    claimed_count: number;
    enrichment_status: string | null;
    email: string | null;
    intelligence: string | null;
    created_at: Date;
}) {
    let score = 0;
    if (lead.claimed_count > 0) score += 100;
    if (lead.email) score += 50;
    if (lead.intelligence) score += 30;
    if (lead.enrichment_status === 'found') score += 20;
    return score;
}

export async function removeDuplicateLeads(): Promise<{
    groups: number;
    removed: number;
    kept: number;
}> {
    const leads = await prisma.leadPost.findMany({
        where: { is_deleted: false },
        select: {
            id: true,
            post_id: true,
            platform: true,
            url: true,
            content: true,
            claimed_count: true,
            enrichment_status: true,
            email: true,
            intelligence: true,
            created_at: true,
        },
        orderBy: { created_at: 'asc' },
    });

    const groups = new Map<string, typeof leads>();
    for (const lead of leads) {
        const key = getLeadDedupKey(lead);
        const bucket = groups.get(key) || [];
        bucket.push(lead);
        groups.set(key, bucket);
    }

    const toRemove: string[] = [];
    let duplicateGroups = 0;

    for (const [, bucket] of groups) {
        if (bucket.length <= 1) continue;
        duplicateGroups++;

        const sorted = [...bucket].sort((a, b) => {
            const scoreDiff = scoreLeadForKeep(b) - scoreLeadForKeep(a);
            if (scoreDiff !== 0) return scoreDiff;
            return a.created_at.getTime() - b.created_at.getTime();
        });

        const [, ...dupes] = sorted;
        toRemove.push(...dupes.map((l) => l.id));
    }

    if (toRemove.length > 0) {
        await prisma.leadPost.updateMany({
            where: { id: { in: toRemove } },
            data: { is_deleted: true, deleted_at: new Date() },
        });
    }

    return {
        groups: duplicateGroups,
        removed: toRemove.length,
        kept: leads.length - toRemove.length,
    };
}
