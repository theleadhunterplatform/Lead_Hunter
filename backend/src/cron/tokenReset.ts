import cron from 'node-cron';
import prisma from '../lib/prisma';
import { getPlanDefinition, currentPlanMonth } from '../utils/plan.utils';

/**
 * Monthly token reset cron — runs at 00:00 on the 1st of every month.
 * Resets all users' tokens to their plan's monthly allocation.
 */
export const initTokenResetCron = () => {
    cron.schedule('0 0 1 * *', async () => {
        console.log('--- [TokenReset] Starting monthly token reset ---');
        const month = currentPlanMonth();

        try {
            const users = await prisma.user.findMany({
                where: { is_deleted: false, is_active: true },
                select: { id: true, plan: true, email: true },
            });

            let reset = 0;
            for (const user of users) {
                const plan = getPlanDefinition(user.plan);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { tokens: plan.monthly_tokens },
                });

                // Reset monthly claim state
                const planStateKey = `user_plan_state_${user.id}`;
                await prisma.setting.upsert({
                    where: { key: planStateKey },
                    update: {
                        value: { refill_month: month, claims_this_month: 0 } as any,
                        is_deleted: false,
                        deleted_at: null,
                    },
                    create: {
                        key: planStateKey,
                        value: { refill_month: month, claims_this_month: 0 } as any,
                        description: 'User plan monthly usage state',
                    },
                });
                reset++;
            }

            console.log(`✅ [TokenReset] Reset tokens for ${reset} users for month ${month}`);
        } catch (err: any) {
            console.error('❌ [TokenReset] Monthly reset failed:', err.message);
        }
    });

    console.log('✔ Monthly token reset cron initialized: 1st of each month at 00:00');
};
