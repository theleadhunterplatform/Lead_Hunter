import prisma from '../lib/prisma';
import { toApiDoc, toApiDocs } from '../utils/serialize.utils';

const Organization = {
    async create(data: { name: string; ownerId: string }) {
        const org = await prisma.organization.create({
            data: {
                name: data.name,
                ownerId: data.ownerId,
            },
        });
        return toApiDoc(org);
    },

    async findById(id: string) {
        const org = await prisma.organization.findUnique({ where: { id } });
        return toApiDoc(org);
    },

    async find(filter: any = {}) {
        const where: any = {};
        if (filter.is_deleted !== undefined) where.is_deleted = filter.is_deleted;
        if (filter._id) where.id = filter._id;

        const orgs = await prisma.organization.findMany({ where });
        return toApiDocs(orgs);
    },

    async findByIdAndUpdate(id: string, data: any, _options?: any) {
        const org = await prisma.organization.update({
            where: { id },
            data: {
                ownerId: data.ownerId,
                name: data.name,
                status: data.status,
            },
        });
        return toApiDoc(org);
    },
};

export default Organization;
