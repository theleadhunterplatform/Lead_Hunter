import prisma from '../lib/prisma';
import { toApiDoc, toApiDocs } from '../utils/serialize.utils';

const SourceProfile = {
    async find(filter: any = {}) {
        const profiles = await prisma.sourceProfile.findMany({
            where: { is_active: filter.is_active },
        });
        return toApiDocs(profiles);
    },

    async create(data: { name: string; url: string; platform?: string }) {
        const profile = await prisma.sourceProfile.create({ data });
        return toApiDoc(profile);
    },
};

export default SourceProfile;
