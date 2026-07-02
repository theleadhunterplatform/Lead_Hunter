import prisma from '../lib/prisma';

export type ScrapeRunPayload = {
    job_name: 'keyword-scrape' | 'watchlist-scrape';
    status: 'completed' | 'failed';
    items_scraped: number;
    total_processed: number;
    new_leads: number;
    duplicate_count: number;
    error?: string;
    details?: Record<string, unknown>;
    started_at: Date;
};

export async function logScrapeRun(payload: ScrapeRunPayload): Promise<void> {
    try {
        await prisma.cronLog.create({
            data: {
                job_name: payload.job_name,
                start_time: payload.started_at,
                end_time: new Date(),
                status: payload.status,
                items_scraped: payload.items_scraped,
                total_processed: payload.total_processed,
                new_leads: payload.new_leads,
                duplicate_count: payload.duplicate_count,
                error: payload.error,
                details: payload.details ? JSON.stringify(payload.details) : undefined,
            },
        });
    } catch (error: any) {
        console.error('[ScrapeRunLog] Failed to persist cron log:', error.message);
    }
}

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

export async function getScrapeActivityStats() {
    const today = startOfToday();

    const [ingestedToday, runsToday, todayAgg, lastRun] = await Promise.all([
        prisma.leadPost.count({
            where: {
                is_deleted: false,
                source: 'scraped',
                created_at: { gte: today },
            },
        }),
        prisma.cronLog.count({
            where: {
                is_deleted: false,
                job_name: { in: ['keyword-scrape', 'watchlist-scrape'] },
                start_time: { gte: today },
            },
        }),
        prisma.cronLog.aggregate({
            where: {
                is_deleted: false,
                job_name: { in: ['keyword-scrape', 'watchlist-scrape'] },
                start_time: { gte: today },
                status: 'completed',
            },
            _sum: {
                items_scraped: true,
                new_leads: true,
                duplicate_count: true,
            },
        }),
        prisma.cronLog.findFirst({
            where: {
                is_deleted: false,
                job_name: { in: ['keyword-scrape', 'watchlist-scrape'] },
            },
            orderBy: { start_time: 'desc' },
        }),
    ]);

    let last_scrape_run: Record<string, unknown> | null = null;
    if (lastRun) {
        let details: Record<string, unknown> = {};
        if (lastRun.details) {
            try {
                details = JSON.parse(lastRun.details);
            } catch {
                details = { raw: lastRun.details };
            }
        }

        const endedAt = lastRun.end_time || lastRun.start_time;
        last_scrape_run = {
            at: endedAt.toISOString(),
            status: lastRun.status,
            job_name: lastRun.job_name,
            platform: details.platform ?? null,
            keyword: details.keywordText ?? null,
            target_name: details.targetName ?? null,
            items_scraped: lastRun.items_scraped,
            new_leads: lastRun.new_leads,
            skipped: lastRun.duplicate_count,
            error: lastRun.error ?? null,
            duration_ms: lastRun.end_time
                ? lastRun.end_time.getTime() - lastRun.start_time.getTime()
                : null,
        };
    }

    return {
        scrape_ingested_today: ingestedToday,
        scrape_runs_today: runsToday,
        today_items_fetched: todayAgg._sum.items_scraped ?? 0,
        today_new_from_scrapes: todayAgg._sum.new_leads ?? 0,
        today_skipped_from_scrapes: todayAgg._sum.duplicate_count ?? 0,
        last_scrape_run,
    };
}
