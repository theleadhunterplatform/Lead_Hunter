import prisma from '../lib/prisma';
import ApifyKey from '../models/apify-key.model';
import ErrorResponse from '../utils/error-response.utils';
import config from '../config';
import { toApiDocs } from '../utils/serialize.utils';

function currentUsageMonth(): string {
    return new Date().toISOString().slice(0, 7);
}

async function syncMonthlyUsage(keys: any[]) {
    const month = currentUsageMonth();

    await Promise.all(
        keys
            .filter((key) => key.usage_month !== month)
            .map((key) =>
                prisma.apifyKey.update({
                    where: { id: key.id },
                    data: { comments_used: 0, usage_month: month },
                })
            )
    );

    return keys.map((key) => ({
        ...key,
        comments_used: key.usage_month !== month ? 0 : key.comments_used,
        usage_month: month,
        comments_remaining: Math.max(
            0,
            (key.comments_limit || config.apify.monthlyCommentLimit) -
                (key.usage_month !== month ? 0 : key.comments_used)
        ),
    }));
}

export const getAllApifyKeys = async () => {
    const keys = await prisma.apifyKey.findMany({
        where: { is_deleted: false },
        orderBy: { created_at: 'desc' },
    });

    const synced = await syncMonthlyUsage(keys);
    return toApiDocs(synced);
};

export const getApifyKeyById = async (id: string) => {
    const key = await ApifyKey.findOne({ _id: id, is_deleted: false });
    if (!key) {
        throw new ErrorResponse(`Apify key not found with id of ${id}`, 404);
    }
    return key;
};

export const addApifyKey = async (data: { key: string; label?: string }) => {
    const { key, label } = data;

    const existing = await ApifyKey.findOne({ key: key.trim() });
    if (existing) {
        if (existing.is_deleted) {
            existing.is_deleted = false;
            existing.deleted_at = null;
            existing.is_active = true;
            existing.label = label || existing.label;
            await existing.save();
            return existing;
        }
        throw new ErrorResponse('Apify key already exists', 400);
    }

    return await ApifyKey.create({
        key: key.trim(),
        label,
        comments_limit: config.apify.monthlyCommentLimit,
        usage_month: currentUsageMonth(),
    });
};

export const updateApifyKey = async (id: string, data: any) => {
    const key = await ApifyKey.findOne({ _id: id, is_deleted: false });

    if (!key) {
        throw new ErrorResponse(`Apify key not found with id of ${id}`, 404);
    }

    return await prisma.$transaction(async (tx) => {
        if (data.is_active) {
            await tx.apifyKey.updateMany({
                where: { id: { not: id } },
                data: { is_active: false },
            });
        }

        const updatedKey = await tx.apifyKey.update({
            where: { id },
            data,
        });

        return updatedKey;
    });
};

export const deleteApifyKey = async (id: string) => {
    const apifyKey = await ApifyKey.findById(id);

    if (!apifyKey) {
        throw new ErrorResponse(`Apify key not found with id of ${id}`, 404);
    }

    apifyKey.is_deleted = true;
    apifyKey.deleted_at = new Date();
    apifyKey.is_active = false;
    await apifyKey.save();

    return apifyKey;
};
