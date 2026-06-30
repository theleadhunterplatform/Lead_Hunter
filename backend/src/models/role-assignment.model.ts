import prisma from '../lib/prisma';
import { toApiDoc } from '../utils/serialize.utils';

const mapAssignment = (record: any) => {
    if (!record) return null;
    const doc = toApiDoc(record);
    if (record.role) doc.roleId = toApiDoc(record.role);
    if (record.user) doc.userId = toApiDoc(record.user);
    return doc;
};

const buildWhere = (filter: any = {}) => {
    const where: any = {};
    const and: any[] = [];

    if (filter.userId) where.userId = filter.userId;
    if (filter.roleId) where.roleId = filter.roleId;
    if (filter._id || filter.id) where.id = filter._id || filter.id;

    if (filter['scope.type']) where.scopeType = filter['scope.type'];
    if (filter['scope.organizationId']) where.organizationId = filter['scope.organizationId'];

    if (filter.$or) {
        const or: any[] = [];
        for (const clause of filter.$or) {
            if (clause.expiresAt === null) {
                or.push({ expiresAt: null });
            } else if (clause.expiresAt?.$gt) {
                or.push({ expiresAt: { gt: clause.expiresAt.$gt } });
            } else if (clause['scope.type'] === 'global') {
                or.push({ scopeType: 'global' });
            } else if (clause['scope.type'] === 'organization') {
                or.push({
                    scopeType: 'organization',
                    organizationId: clause['scope.organizationId'],
                });
            }
        }
        if (or.length) where.OR = or;
    }

    if (and.length) where.AND = and;
    return where;
};

const RoleAssignment = {
    async findOne(filter: any) {
        const assignment = await prisma.roleAssignment.findFirst({
            where: buildWhere(filter),
            include: { role: true, user: true },
        });
        return mapAssignment(assignment);
    },

    async find(filter: any = {}, options?: { populate?: string | string[] }) {
        const include: any = {};
        const populate = options?.populate;
        const populateList = Array.isArray(populate) ? populate : populate ? [populate] : [];

        if (populateList.includes('roleId') || populateList.length === 0) include.role = true;
        if (populateList.includes('userId')) {
            include.user = {
                select: { id: true, name: true, email: true, is_deleted: true, is_active: true },
            };
        }

        const assignments = await prisma.roleAssignment.findMany({
            where: buildWhere(filter),
            include: Object.keys(include).length ? include : undefined,
        });

        return assignments.map(mapAssignment);
    },

    async findById(id: string, options?: { populate?: string }) {
        const include: any = {};
        if (options?.populate === 'roleId') include.role = true;

        const assignment = await prisma.roleAssignment.findUnique({
            where: { id },
            include,
        });
        return mapAssignment(assignment);
    },

    async removeById(id: string) {
        await prisma.roleAssignment.delete({ where: { id } });
        return { deletedCount: 1 };
    },

    async removeAllForUser(userId: string) {
        const result = await prisma.roleAssignment.deleteMany({ where: { userId } });
        return { deletedCount: result.count };
    },

    async create(data: any) {
        const assignment = await prisma.roleAssignment.create({
            data: {
                userId: data.userId,
                roleId: data.roleId,
                scopeType: data.scope?.type || data.scopeType || 'global',
                organizationId: data.scope?.organizationId || data.organizationId || null,
                assignedById: data.assignedBy || data.assignedById || null,
                expiresAt: data.expiresAt || null,
            },
            include: { role: true },
        });
        return mapAssignment(assignment);
    },
};

export default RoleAssignment;
