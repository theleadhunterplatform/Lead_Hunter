import prisma from '../lib/prisma';
import { scraperQueue } from '../queues';
import ErrorResponse from '../utils/error-response.utils';
import { isValidLinkedInProfileUrl, normalizeLinkedInUrl } from '../utils/linkedin-url.utils';
import { toApiDoc, toApiDocs } from '../utils/serialize.utils';

function currentUsageMonth(): string {
    return new Date().toISOString().slice(0, 7);
}

async function withSyncedUsage(targets: any[]) {
    const month = currentUsageMonth();

    await Promise.all(
        targets
            .filter((t) => t.usage_month && t.usage_month !== month)
            .map((t) =>
                prisma.sourceProfile.update({
                    where: { id: t.id },
                    data: { monthly_comments_found: 0, usage_month: month },
                })
            )
    );

    return targets.map((t) => ({
        ...t,
        monthly_comments_found: t.usage_month !== month ? 0 : t.monthly_comments_found,
        usage_month: month,
    }));
}

export const getAllTargets = async (query?: { active?: string }) => {
    const where: any = {};
    if (query?.active === 'true') where.is_active = true;
    if (query?.active === 'false') where.is_active = false;

    const targets = await prisma.sourceProfile.findMany({
        where,
        orderBy: { created_at: 'desc' },
    });

    const synced = await withSyncedUsage(targets);
    return toApiDocs(synced as any[]);
};

export const getTargetById = async (id: string) => {
    const target = await prisma.sourceProfile.findUnique({ where: { id } });
    if (!target) {
        throw new ErrorResponse(`Target not found with id of ${id}`, 404);
    }
    return toApiDoc(target);
};

export const createTarget = async (data: {
    name: string;
    url: string;
    platform?: string;
    notes?: string;
}) => {
    if (!isValidLinkedInProfileUrl(data.url)) {
        throw new ErrorResponse('Please provide a valid LinkedIn profile or company URL', 400);
    }

    const url = normalizeLinkedInUrl(data.url);
    const existing = await prisma.sourceProfile.findUnique({ where: { url } });
    if (existing) {
        throw new ErrorResponse('This profile is already on the watchlist', 400);
    }

    const target = await prisma.sourceProfile.create({
        data: {
            name: data.name.trim(),
            url,
            platform: data.platform || 'linkedin',
            notes: data.notes?.trim() || null,
        },
    });
    return toApiDoc(target);
};

export const updateTarget = async (id: string, data: {
    name?: string;
    url?: string;
    notes?: string;
    is_active?: boolean;
    platform?: string;
}) => {
    const existing = await prisma.sourceProfile.findUnique({ where: { id } });
    if (!existing) {
        throw new ErrorResponse(`Target not found with id of ${id}`, 404);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.notes !== undefined) updateData.notes = data.notes.trim() || null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.platform !== undefined) updateData.platform = data.platform;

    if (data.url !== undefined) {
        if (!isValidLinkedInProfileUrl(data.url)) {
            throw new ErrorResponse('Please provide a valid LinkedIn profile or company URL', 400);
        }
        const url = normalizeLinkedInUrl(data.url);
        const duplicate = await prisma.sourceProfile.findFirst({
            where: { url, NOT: { id } },
        });
        if (duplicate) {
            throw new ErrorResponse('This profile URL is already on the watchlist', 400);
        }
        updateData.url = url;
    }

    const target = await prisma.sourceProfile.update({
        where: { id },
        data: updateData,
    });
    return toApiDoc(target);
};

export const deleteTarget = async (id: string) => {
    const existing = await prisma.sourceProfile.findUnique({ where: { id } });
    if (!existing) {
        throw new ErrorResponse(`Target not found with id of ${id}`, 404);
    }
    await prisma.sourceProfile.delete({ where: { id } });
    return toApiDoc(existing);
};

export const enqueueTargetScrape = async (id: string) => {
    const target = await prisma.sourceProfile.findUnique({ where: { id } });
    if (!target) {
        throw new ErrorResponse(`Target not found with id of ${id}`, 404);
    }

    if (!target.is_active) {
        throw new ErrorResponse('Cannot scrape a paused target. Activate it first.', 400);
    }

    const job = await scraperQueue.add(`manual-scrape-target-${target.name}`, {
        type: 'target',
        targetId: target.id,
        targetName: target.name,
        targetUrl: target.url,
    }, {
        removeOnComplete: true,
    });

    return {
        target: toApiDoc(target),
        jobId: job.id,
        message: `Scrape queued for "${target.name}"`,
    };
};

export const enqueueAllTargetScrapes = async () => {
    const activeTargets = await prisma.sourceProfile.findMany({
        where: { is_active: true, platform: 'linkedin' },
        orderBy: { name: 'asc' },
    });

    if (activeTargets.length === 0) {
        throw new ErrorResponse('No active watchlist targets to scrape.', 400);
    }

    const jobs = await Promise.all(
        activeTargets.map((target) =>
            scraperQueue.add(
                `manual-scrape-target-${target.name}-${Date.now()}`,
                {
                    type: 'target',
                    targetId: target.id,
                    targetName: target.name,
                    targetUrl: target.url,
                },
                { removeOnComplete: true }
            )
        )
    );

    return {
        count: activeTargets.length,
        jobIds: jobs.map((j) => j.id),
        message: `Scrape queued for ${activeTargets.length} active watchlist targets`,
    };
};
