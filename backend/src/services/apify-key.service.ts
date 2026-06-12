import prisma from '../lib/prisma';
import ApifyKey from '../models/apify-key.model';
import ErrorResponse from '../utils/error-response.utils';

export const getAllApifyKeys = async () => {
    return await ApifyKey.find({ is_deleted: false }, { sort: { created_at: -1 } });
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
        label
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
