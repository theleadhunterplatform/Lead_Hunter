import prisma from '../lib/prisma';
import { toApiDoc } from '../utils/serialize.utils';

const Permission = {
    async findOne(filter: { slug?: string }) {
        const permission = await prisma.permission.findFirst({ where: filter });
        return toApiDoc(permission);
    },
};

export default Permission;
