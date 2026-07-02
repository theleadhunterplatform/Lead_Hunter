import prisma from '../lib/prisma';
import User from '../models/user.model';
import { toApiDocs } from '../utils/serialize.utils';

export const getLeaderboardData = async (query: { limit?: number }) => {
    const limit = query.limit || 10;

    const topUsers = await prisma.user.findMany({
        where: { is_deleted: false },
        orderBy: [{ points: 'desc' }, { createdAt: 'asc' }],
        take: limit,
        select: {
            id: true,
            name: true,
            points: true,
            plan: true,
            referral_count: true,
        },
    });

    return toApiDocs(topUsers as any[]);
};

export const addPoints = async (userId: string, points: number, reason: string) => {
    const user = await User.findById(userId);
    if (!user) return null;

    user.points += points;

    const tokensToAdd = Math.floor(user.points / 100);
    if (tokensToAdd > 0) {
        user.tokens += tokensToAdd;
        user.points = user.points % 100;
        console.log(`🎁 [Leaderboard] User ${user.email} converted points to ${tokensToAdd} tokens. Reason: ${reason}`);
    }

    await user.save();
    return user;
};
