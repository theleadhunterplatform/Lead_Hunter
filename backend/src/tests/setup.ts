import '../config/database-env';
import prisma from '../lib/prisma';
import { seedRBAC } from '../utils/seed-rbac.utils';

export const connect = async () => {
    await prisma.$connect();
    await seedRBAC();
};

export const close = async () => {
    await prisma.$disconnect();
};

export const clear = async () => {
    await prisma.$transaction([
        prisma.scrapedPost.deleteMany(),
        prisma.leadIntelligence.deleteMany(),
        prisma.claim.deleteMany(),
        prisma.leadPost.deleteMany(),
        prisma.roleAssignment.deleteMany(),
        prisma.auditLog.deleteMany(),
        prisma.apifyKey.deleteMany(),
        prisma.keyword.deleteMany(),
        prisma.setting.deleteMany(),
        prisma.user.deleteMany(),
        prisma.organization.deleteMany(),
        prisma.role.deleteMany(),
    ]);

    await seedRBAC();
};
