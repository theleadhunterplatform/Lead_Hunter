import prisma from '../lib/prisma';
import { wrapDoc } from '../db/wrap-doc';

const mapKeyword = (record: any) => {
    if (!record) return null;
    return wrapDoc(record, async (id, data) => prisma.keyword.update({ where: { id }, data: data as any }));
};

const Keyword = {
    async find(filter: any = {}, options?: { sort?: Record<string, number> }) {
        const keywords = await prisma.keyword.findMany({
            where: {
                is_deleted: filter.is_deleted ?? undefined,
            },
            orderBy: options?.sort?.created_at === -1 ? { created_at: 'desc' } : undefined,
        });
        return keywords.map(mapKeyword);
    },

    async findOne(filter: any) {
        const where: any = {};
        if (filter._id || filter.id) where.id = filter._id || filter.id;
        if (filter.text) where.text = filter.text;
        if (filter.is_deleted !== undefined) where.is_deleted = filter.is_deleted;

        const keyword = await prisma.keyword.findFirst({ where });
        return mapKeyword(keyword);
    },

    async findById(id: string) {
        const keyword = await prisma.keyword.findUnique({ where: { id } });
        return mapKeyword(keyword);
    },

    async create(data: { text: string; platforms?: string[]; is_deleted?: boolean }) {
        const keyword = await prisma.keyword.create({
            data: {
                text: data.text,
                platforms: data.platforms || ['linkedin'],
                is_deleted: data.is_deleted ?? false,
            },
        });
        return mapKeyword(keyword);
    },

    async findOneAndUpdate(filter: any, data: any, _options?: any) {
        const id = filter._id || filter.id;
        const keyword = await prisma.keyword.update({
            where: { id },
            data,
        });
        return mapKeyword(keyword);
    },

    async updateMany(filter: any, update: any, _options?: any) {
        const where: any = { is_deleted: filter.is_deleted ?? undefined };
        if (filter._id?.$in) where.id = { in: filter._id.$in };

        const data = update.$set || update;
        const result = await prisma.keyword.updateMany({ where, data });
        return { modifiedCount: result.count };
    },
};

export default Keyword;
