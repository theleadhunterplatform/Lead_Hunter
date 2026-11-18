import prisma from '../lib/prisma';
import axios from 'axios';

async function reconcile() {
    console.log('🔄 Reconciling all Apify keys with live platform balances...');
    const keys = await prisma.apifyKey.findMany({
        where: { is_deleted: false },
        orderBy: { created_at: 'asc' },
    });

    let reactivated = 0;
    let exhausted = 0;
    let errors = 0;

    for (const k of keys) {
        try {
            const res = await axios.get('https://api.apify.com/v2/users/me/limits', {
                headers: { Authorization: `Bearer ${k.key}` },
                timeout: 8000,
            });

            const maxUsd = res.data?.data?.limits?.maxMonthlyUsageUsd ?? 5;
            const usedUsd = res.data?.data?.current?.monthlyUsageUsd ?? 0;
            const remainingUsd = +(maxUsd - usedUsd).toFixed(2);

            if (remainingUsd > 0.05) {
                await prisma.apifyKey.update({
                    where: { id: k.id },
                    data: {
                        is_active: true,
                        error_message: null,
                    },
                });
                console.log(`  ✅ [${k.label}] Reactivated: $${remainingUsd} remaining ($${usedUsd.toFixed(2)} / $${maxUsd})`);
                reactivated++;
            } else {
                await prisma.apifyKey.update({
                    where: { id: k.id },
                    data: {
                        is_active: false,
                        error_message: `Apify spend exhausted ($${usedUsd.toFixed(2)} / $${maxUsd})`,
                    },
                });
                console.log(`  ❌ [${k.label}] Kept exhausted: $${remainingUsd} remaining`);
                exhausted++;
            }
        } catch (err: any) {
            const status = err.response?.status;
            console.error(`  ⚠️ [${k.label}] Failed to check Apify: ${status || err.message}`);
            errors++;
        }
    }

    console.log(`\nReconciliation complete: ${reactivated} keys active, ${exhausted} keys exhausted, ${errors} errors.`);
    await prisma.$disconnect();
}

reconcile().catch(console.error);
