import prisma from '../lib/prisma';
import { toApiDoc } from '../utils/serialize.utils';

const AuditLog = {
    async find(filter: any = {}) {
        const logs = await prisma.auditLog.findMany({
            where: {
                actorId: filter.actorId,
                action: filter.action,
            },
            orderBy: { createdAt: 'desc' },
        });
        return logs.map(toApiDoc);
    },

    async create(data: any) {
        const log = await prisma.auditLog.create({
            data: {
                actorId: data.actorId,
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId,
                organizationId: data.organizationId || null,
                details: data.details || null,
                status: data.status,
                ipAddress: data.ipAddress,
            },
        });
        return toApiDoc(log);
    },
};

export default AuditLog;
