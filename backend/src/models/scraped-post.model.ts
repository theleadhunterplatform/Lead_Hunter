import prisma from '../lib/prisma';
import { toApiDoc } from '../utils/serialize.utils';

const ScrapedPost = {
    async create(data: any) {
        const record = await prisma.scrapedPost.create({
            data: {
                log_id: data.log_id,
                post_id: data.post,
                is_duplicate: data.is_duplicate ?? false,
            },
        });
        return toApiDoc(record);
    },
};

export default ScrapedPost;
