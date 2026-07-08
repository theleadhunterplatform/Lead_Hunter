import '../config/database-env';
import prisma from '../lib/prisma';
import { seedRBAC } from '../utils/seed-rbac.utils';

export const connect = async () => {
    process.env.REQUIRE_SIGNUP_APPROVAL = 'false';
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
        prisma.user.updateMany({ data: { organizationId: null } }),
        prisma.organization.deleteMany(),
        prisma.user.deleteMany(),
        prisma.role.deleteMany(),
    ]);

    await seedRBAC();
};
