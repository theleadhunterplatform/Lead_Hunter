import { ApifyClient } from 'apify-client';
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
    const trimmedKey = key.trim();

    // Verify token validity with Apify before saving
    try {
        const apify = new ApifyClient({ token: trimmedKey });
        const user = await apify.user().get();
        if (!user) {
            throw new Error('User not found on Apify');
        }
    } catch (err: any) {
        const message = err.message || 'User was not found or authentication token is not valid';
        throw new ErrorResponse(
            `Apify rejected this token (${message}). Please verify the token on console.apify.com and ensure the account's email is confirmed.`,
            400
        );
    }

    const existing = await ApifyKey.findOne({ key: trimmedKey });
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
        key: trimmedKey,
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

    // If activating the key, verify it works with Apify first
    if (data.is_active === true) {
        const tokenToTest = (data.key || key.key).trim();
        try {
            const apify = new ApifyClient({ token: tokenToTest });
            const user = await apify.user().get();
            if (!user) {
                throw new Error('User not found on Apify');
            }
        } catch (err: any) {
            const message = err.message || 'User was not found or authentication token is not valid';
            throw new ErrorResponse(
                `Cannot activate: Apify rejected this token (${message}).`,
                400
            );
        }
    }

    const updatedKey = await prisma.apifyKey.update({
        where: { id },
        data,
    });

    return updatedKey;
};

export const deleteApifyKey = async (id: string) => {
    const apifyKey = await ApifyKey.findById(id);

    if (!apifyKey) {
        throw new ErrorResponse(`Apify key not found with id of ${id}`, 404);
    }

    // Hard delete directly via Prisma
    await prisma.apifyKey.delete({ where: { id } });

    return apifyKey;
};
