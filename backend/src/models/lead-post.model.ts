import prisma from '../lib/prisma';
import { toApiDoc, toApiDocs } from '../utils/serialize.utils';
import { wrapDoc } from '../db/wrap-doc';

const mapPost = (record: any) => {
    if (!record) return null;
    return wrapDoc(record, async (id, data) => prisma.leadPost.update({ where: { id }, data: data as any }));
};

const buildWhere = (filter: any = {}) => {
    const where: any = {};

    if (filter._id || filter.id) where.id = filter._id || filter.id;
    if (filter.is_deleted !== undefined) where.is_deleted = filter.is_deleted;
    if (filter.status) where.status = filter.status;
    if (filter.keyword) where.keyword = filter.keyword;
    if (filter.post_id) where.post_id = filter.post_id;
    if (filter.platform) {
        if (filter.platform.$in) where.platform = { in: filter.platform.$in };
        else where.platform = filter.platform;
    }
    if (filter.intelligence?.$ne === null) where.intelligence = { not: null };

    if (filter.$or) {
        where.OR = filter.$or.map((clause: any) => {
            const part: any = {};
            if (clause.content?.$regex) {
                part.content = { contains: clause.content.$regex, mode: 'insensitive' };
            }
            if (clause.keyword?.$regex) {
                part.keyword = { contains: clause.keyword.$regex, mode: 'insensitive' };
            }
            if (clause['author.name']?.$regex) {
                // JSON author search handled via raw query fallback in service if needed
            }
            return Object.keys(part).length ? part : clause;
        });
    }

    return where;
};

const LeadPost = {
    async find(filter: any = {}, options?: { sort?: Record<string, number>; skip?: number; limit?: number; lean?: boolean }) {
        const posts = await prisma.leadPost.findMany({
            where: buildWhere(filter),
            orderBy: options?.sort?.created_at === -1 ? { created_at: 'desc' } : undefined,
            skip: options?.skip,
            take: options?.limit,
        });

        if (options?.lean) return toApiDocs(posts);
        return posts.map(mapPost);
    },

    async findOne(filter: any, options?: { lean?: boolean }) {
        const post = await prisma.leadPost.findFirst({ where: buildWhere(filter) });
        if (options?.lean) return toApiDoc(post);
        return mapPost(post);
    },

    async findById(id: string) {
        const post = await prisma.leadPost.findUnique({ where: { id } });
        return mapPost(post);
    },

    async countDocuments(filter: any = {}) {
        return prisma.leadPost.count({ where: buildWhere(filter) });
    },

    async create(data: any) {
        const post = await prisma.leadPost.create({
            data: {
                post_id: data.post_id,
                url: data.url,
                content: data.content,
                platform: data.platform || 'linkedin',
                author: data.author || {},
                posted_at: data.posted_at || {},
                engagement: data.engagement || { likes: 0, comments: 0, shares: 0 },
                keyword: data.keyword,
                keyword_id: data.keyword_id || null,
                status: data.status || 'pending',
                source: data.source || 'scraped',
                image_url: data.image_url || null,
                ai_score: data.ai_score ?? 0,
                is_training_data: data.is_training_data ?? false,
                email: data.email || null,
                contact_info: data.contact_info || null,
                raw_result: data.raw_result || null,
                source_type: data.source_type || 'keyword',
                source_profile: data.source_profile || null,
                qualification_reason: data.qualification_reason || null,
                enrichment_status: data.enrichment_status || null,
                enrichment_message: data.enrichment_message || null,
                enriched_at: data.enriched_at || null,
                intelligence: data.intelligence || null,
                claimed_count: data.claimed_count ?? 0,
            },
        });
        return mapPost(post);
    },

    async findOneAndUpdate(filter: any, data: any, _options?: any) {
        const id = filter._id || filter.id;
        const post = await prisma.leadPost.update({
            where: { id },
            data,
        });
        return mapPost(post);
    },

    async findByIdAndUpdate(id: string, data: any, _options?: any) {
        const post = await prisma.leadPost.update({ where: { id }, data });
        return mapPost(post);
    },

    async updateOne(filter: any, data: any) {
        const id = filter._id || filter.id;
        await prisma.leadPost.update({ where: { id }, data });
    },
};

export default LeadPost;
