import prisma from '../lib/prisma';
import { toApiDoc, toApiDocs } from '../utils/serialize.utils';
import { wrapDoc } from '../db/wrap-doc';
import { findExistingLeadPost, isDuplicateKeyError } from '../utils/lead-dedup.utils';

const mapPost = (record: any) => {
    if (!record) return null;
    return wrapDoc(record, async (id, data) => prisma.leadPost.update({ where: { id }, data: data as any }));
};

function mapSearchOrClause(clause: any) {
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
}

/** Contact Found tab: enrichment partial (unverified) or found (verified). */
const CONTACT_DETAILS_CLAUSE = {
    OR: [{ enrichment_status: 'found' }, { enrichment_status: 'partial' }],
};

const buildWhere = (filter: any = {}) => {
    const { $or, has_contact, ...rest } = filter;
    const where: any = {};

    if (rest._id || rest.id) where.id = rest._id || rest.id;
    if (rest.is_deleted !== undefined) where.is_deleted = rest.is_deleted;
    if (rest.status) where.status = rest.status;
    if (rest.keyword) where.keyword = rest.keyword;
    if (rest.post_id) where.post_id = rest.post_id;
    if (rest.enrichment_status) {
        if (rest.enrichment_status.$in) {
            where.enrichment_status = { in: rest.enrichment_status.$in };
        } else {
            where.enrichment_status = rest.enrichment_status;
        }
    }
    if (rest.platform) {
        if (rest.platform.$in) where.platform = { in: rest.platform.$in };
        else where.platform = rest.platform;
    }
    if (rest.intelligence?.$ne === null) where.intelligence = { not: null };
    if (rest.review_status !== undefined) {
        where.review_status = rest.review_status;
    }

    const andClauses: any[] = [];
    if (Object.keys(where).length > 0) andClauses.push(where);
    if (has_contact) andClauses.push(CONTACT_DETAILS_CLAUSE);
    if ($or) {
        andClauses.push({ OR: $or.map(mapSearchOrClause) });
    }

    if (andClauses.length === 0) return {};
    if (andClauses.length === 1) return andClauses[0];
    return { AND: andClauses };
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
        const existing = await findExistingLeadPost({
            post_id: data.post_id,
            platform: data.platform || 'linkedin',
            url: data.url,
            content: data.content,
        });
        if (existing) {
            return existing;
        }

        try {
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
                review_status: data.review_status ?? null,
                reviewed_at: data.reviewed_at || null,
                reviewed_by_id: data.reviewed_by_id || null,
                claimed_count: data.claimed_count ?? 0,
            },
        });
        return mapPost(post);
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                const dup = await findExistingLeadPost({
                    post_id: data.post_id,
                    platform: data.platform || 'linkedin',
                    url: data.url,
                    content: data.content,
                });
                if (dup) return dup;
            }
            throw error;
        }
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
