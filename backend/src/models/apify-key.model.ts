import prisma from '../lib/prisma';
import { wrapDoc } from '../db/wrap-doc';

const mapKey = (record: any) => {
    if (!record) return null;
    return wrapDoc(record, async (id, data) => prisma.apifyKey.update({ where: { id }, data: data as any }));
};

const ApifyKey = {
    async find(filter: any = {}, options?: { sort?: Record<string, number> }) {
        let orderBy: any = { created_at: 'desc' };
        if (options?.sort?.created_at === 1) orderBy = { created_at: 'asc' };
        if (options?.sort?.created_at === -1) orderBy = { created_at: 'desc' };

        const keys = await prisma.apifyKey.findMany({
            where: {
                is_deleted: filter.is_deleted ?? undefined,
                is_active: filter.is_active ?? undefined,
            },
            orderBy,
        });
        return keys.map(mapKey);
    },

    async findOne(filter: any, _options?: any) {
        const where: any = {};
        if (filter._id || filter.id) where.id = filter._id || filter.id;
        if (filter.key) where.key = filter.key;
        if (filter.is_active !== undefined) where.is_active = filter.is_active;
        if (filter.is_deleted !== undefined) where.is_deleted = filter.is_deleted;

        const key = await prisma.apifyKey.findFirst({
            where,
            orderBy: filter.sort?.created_at === 1 ? { created_at: 'asc' } : undefined,
        });
        return mapKey(key);
    },

    async findById(id: string) {
        const key = await prisma.apifyKey.findUnique({ where: { id } });
        return mapKey(key);
    },

    async create(data: { key: string; label?: string }) {
        const key = await prisma.apifyKey.create({ data });
        return mapKey(key);
    },

    async findByIdAndUpdate(id: string, data: any, _options?: any) {
        const key = await prisma.apifyKey.update({ where: { id }, data });
        return mapKey(key);
    },

    async updateMany(filter: any, data: any) {
        const where: any = {};
        if (filter._id?.$ne) where.id = { not: filter._id.$ne };

        const result = await prisma.apifyKey.updateMany({ where, data });
        return { modifiedCount: result.count };
    },
};

export default ApifyKey;
