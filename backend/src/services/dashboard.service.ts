import prisma from '../lib/prisma';
import { getUserPermissions, hasPermission as checkPermission } from '../utils/rbac.utils';

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfWeek(): Date {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

const baseLeadFilter = { is_deleted: false };

export async function getLeadStats() {
    const today = startOfToday();

    const [
        qualifiedToday,
        qualifiedTotal,
        scrapedToday,
        scrapedTotal,
        pending,
        withEmail,
        watchlistActive,
    ] = await Promise.all([
        prisma.leadPost.count({
            where: { ...baseLeadFilter, status: 'relevant', created_at: { gte: today } },
        }),
        prisma.leadPost.count({
            where: { ...baseLeadFilter, status: 'relevant' },
        }),
        prisma.leadPost.count({
            where: { ...baseLeadFilter, created_at: { gte: today } },
        }),
        prisma.leadPost.count({
            where: baseLeadFilter,
        }),
        prisma.leadPost.count({
            where: { ...baseLeadFilter, status: 'pending' },
        }),
        prisma.leadPost.count({
            where: { ...baseLeadFilter, status: 'relevant', email: { not: null } },
        }),
        prisma.sourceProfile.count({
            where: { is_active: true, platform: 'linkedin' },
        }),
    ]);

    return {
        qualified_today: qualifiedToday,
        qualified_total: qualifiedTotal,
        scraped_today: scrapedToday,
        scraped_total: scrapedTotal,
        pending,
        with_email: withEmail,
        watchlist_active: watchlistActive,
    };
}

export async function getDashboardStats(currentUser: any) {
    const permissions = await getUserPermissions(
        currentUser.id,
        currentUser.organization?.toString()
    );
    const isInternal =
        checkPermission(permissions, '*') || checkPermission(permissions, 'system:admin');

    const weekStart = startOfWeek();

    const [
        leadStats,
        qualifiedThisWeek,
        irrelevantTotal,
        userClaims,
        availableLeads,
    ] = await Promise.all([
        getLeadStats(),
        prisma.leadPost.count({
            where: { ...baseLeadFilter, status: 'relevant', created_at: { gte: weekStart } },
        }),
        prisma.leadPost.count({
            where: { ...baseLeadFilter, status: 'irrelevant' },
        }),
        prisma.claim.count({ where: { userId: currentUser.id } }),
        prisma.leadPost.count({
            where: {
                ...baseLeadFilter,
                status: 'relevant',
                intelligence: { not: null },
            },
        }),
    ]);

    const reviewed = leadStats.qualified_total + irrelevantTotal;
    const successRate = reviewed > 0
        ? Math.round((leadStats.qualified_total / reviewed) * 100)
        : 0;

    const stats: Record<string, any> = {
        leads: {
            ...leadStats,
            qualified_this_week: qualifiedThisWeek,
            irrelevant_total: isInternal ? irrelevantTotal : undefined,
            available_to_claim: availableLeads,
        },
        user: {
            tokens: currentUser.tokens ?? 0,
            claimed_leads: userClaims,
            referral_count: currentUser.referral_count ?? 0,
        },
        success_rate: successRate,
        weekly_goal: 100,
    };

    if (isInternal) {
        const [totalClaims, totalUsers] = await Promise.all([
            prisma.claim.count(),
            prisma.user.count({ where: { is_deleted: false } }),
        ]);
        stats.platform = {
            total_claims: totalClaims,
            total_users: totalUsers,
        };
    }

    return stats;
}
