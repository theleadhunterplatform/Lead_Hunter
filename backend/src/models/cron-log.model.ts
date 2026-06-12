import prisma from '../lib/prisma';
import { toApiDoc } from '../utils/serialize.utils';

const CronLog = {
    async create(data: any) {
        const log = await prisma.cronLog.create({ data });
        return toApiDoc(log);
    },
};

export default CronLog;
