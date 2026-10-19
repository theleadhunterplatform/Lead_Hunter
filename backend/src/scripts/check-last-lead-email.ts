import prisma from '../lib/prisma';

async function main() {
    console.log('--- Checking Leads Table ---');
    const totalLeads = await prisma.leadPost.count();
    const approvedCount = await prisma.leadPost.count({ where: { review_status: 'approved' } });
    const awaitingCount = await prisma.leadPost.count({ where: { review_status: 'awaiting_review' } });
    console.log(`Total Leads: ${totalLeads} | Approved: ${approvedCount} | Awaiting Review: ${awaitingCount}`);

    const recentLeads = await prisma.leadPost.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
            id: true,
            title: true,
            status: true,
            review_status: true,
            reviewed_at: true,
            created_at: true,
        },
    });

    console.log('Recent 5 leads in DB:');
    recentLeads.forEach((l, idx) => {
        console.log(`[${idx + 1}] ID: ${l.id} | Status: ${l.status} | ReviewStatus: ${l.review_status} | ReviewedAt: ${l.reviewed_at} | CreatedAt: ${l.created_at}`);
    });

    console.log('\n--- Checking Last Lead Alert Email ---');
    const emailLogs = await (prisma as any).emailLog.findMany({
        where: {
            OR: [
                { type: 'LEAD_ALERT' },
                { type: 'lead_drop' },
                { subject: { contains: 'Lead' } },
            ],
        },
        orderBy: {
            sentAt: 'desc',
        },
        take: 5,
    });

    if (emailLogs.length === 0) {
        console.log('No lead alert email logs found in database.');
        
        // Let's also check all email logs in general
        const anyEmail = await (prisma as any).emailLog.findMany({
            orderBy: { sentAt: 'desc' },
            take: 5,
        });
        console.log(`(Total general email logs found: ${anyEmail.length})`);
        anyEmail.forEach((e: any) => {
            const timeStr = e.sentAt ? e.sentAt.toISOString() : (e.createdAt ? e.createdAt.toISOString() : 'N/A');
            console.log(`- Type: ${e.type} | To: ${e.to} | Status: ${e.status} | Subject: "${e.subject}" | At: ${timeStr}`);
        });
    } else {
        emailLogs.forEach((log: any, i: number) => {
            const timeStr = log.sentAt ? log.sentAt.toISOString() : (log.createdAt ? log.createdAt.toISOString() : 'N/A');
            console.log(`[${i + 1}] Type: ${log.type} | Status: ${log.status}`);
            console.log(`    To: ${log.to}`);
            console.log(`    Subject: "${log.subject}"`);
            console.log(`    Sent At: ${timeStr}`);
            if (log.error) console.log(`    Error: ${log.error}`);
        });
    }
}

main()
    .catch((err) => console.error('Error running script:', err))
    .finally(() => prisma.$disconnect());
