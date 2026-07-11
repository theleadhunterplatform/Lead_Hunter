import prisma from '../lib/prisma';
import { toApiDoc } from '../utils/serialize.utils';
import { wrapDoc } from '../db/wrap-doc';

const CLAIM_UPDATE_FIELDS = new Set([
    'status',
    'notes',
    'last_contacted',
    'token_cost',
    'outreach_subject',
    'outreach_body',
    'outreach_generated_at',
]);

const mapClaim = (record: any) => {
    if (!record) return null;
    const doc = wrapDoc(record, async (id, data) => {
        const updateData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            if (CLAIM_UPDATE_FIELDS.has(key)) {
                updateData[key] = value;
            }
        }
        return prisma.claim.update({ where: { id }, data: updateData as any });
    });
    if (record.lead) {
        doc.leadId = toApiDoc(record.lead);
    }
    return doc;
};

const buildWhere = (filter: any = {}) => {
    const where: any = {};
    if (filter.userId) {
        if (filter.userId.$in) where.userId = { in: filter.userId.$in };
        else where.userId = filter.userId;
    }
    if (filter.leadId) {
        if (filter.leadId.$in) where.leadId = { in: filter.leadId.$in };
        else where.leadId = filter.leadId;
    }
    if (filter._id || filter.id) where.id = filter._id || filter.id;
    return where;
};

const Claim = {
    async findOne(filter: any, options?: { populate?: string }) {
        const claim = await prisma.claim.findFirst({
            where: buildWhere(filter),
            include: options?.populate === 'leadId' ? { lead: true } : undefined,
        });
        return mapClaim(claim);
    },

    async find(filter: any = {}, options?: { sort?: Record<string, number>; skip?: number; limit?: number; populate?: string }) {
        const claims = await prisma.claim.findMany({
            where: buildWhere(filter),
            orderBy: options?.sort?.createdAt === -1 ? { createdAt: 'desc' } : undefined,
            skip: options?.skip,
            take: options?.limit,
            include: options?.populate === 'leadId' ? { lead: true } : undefined,
        });
        return claims.map(mapClaim);
    },

    async create(data: any) {
        const claim = await prisma.claim.create({
            data: {
                userId: data.userId,
                leadId: data.leadId,
                token_cost: data.token_cost ?? 1,
                status: data.status || 'new',
                notes: data.notes || '',
            },
        });
        return mapClaim(claim);
    },

    async countDocuments(filter: any = {}) {
        return prisma.claim.count({ where: buildWhere(filter) });
    },

    async exists(filter: any) {
        const count = await prisma.claim.count({ where: buildWhere(filter), take: 1 });
        return count > 0 ? { _id: true } : null;
    },
};

export default Claim;
