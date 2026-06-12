import prisma from '../lib/prisma';
import { toApiDoc } from '../utils/serialize.utils';

const Setting = {
    async findOne(filter: { key: string; is_deleted?: boolean }) {
        const setting = await prisma.setting.findFirst({
            where: {
                key: filter.key,
                is_deleted: filter.is_deleted ?? false,
            },
        });
        return toApiDoc(setting);
    },

    async findOneAndUpdate(filter: { key: string }, data: any, options?: { upsert?: boolean; new?: boolean }) {
        if (options?.upsert) {
            const setting = await prisma.setting.upsert({
                where: { key: filter.key },
                update: data,
                create: {
                    key: filter.key,
                    value: data.value,
                    description: data.description,
                },
            });
            return toApiDoc(setting);
        }

        const setting = await prisma.setting.update({
            where: { key: filter.key },
            data,
        });
        return toApiDoc(setting);
    },
};

export default Setting;
