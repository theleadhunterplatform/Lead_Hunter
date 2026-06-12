import prisma from '../lib/prisma';
import { toApiDoc } from '../utils/serialize.utils';

const LeadIntelligence = {
    async findOneAndUpdate(filter: { post_id: string }, data: { content: string }, options?: { upsert?: boolean; new?: boolean }) {
        const postId = filter.post_id;

        if (options?.upsert) {
            const record = await prisma.leadIntelligence.upsert({
                where: { post_id: postId },
                update: { content: data.content },
                create: { post_id: postId, content: data.content },
            });
            return toApiDoc(record);
        }

        const record = await prisma.leadIntelligence.update({
            where: { post_id: postId },
            data: { content: data.content },
        });
        return toApiDoc(record);
    },
};

export default LeadIntelligence;
