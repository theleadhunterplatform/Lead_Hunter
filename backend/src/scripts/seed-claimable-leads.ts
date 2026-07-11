/**
 * Seeds approved leads with intelligence so external hunters have something to claim.
 * Usage (from backend/): npm run seed:claimable
 *
 * Optional: SEED_ENABLE_AUTO_SCRAPE=true also turns on auto_scrape + auto_enrichment.
 */
import prisma from '../lib/prisma';
import {
    AUTO_ENRICHMENT_KEY,
    AUTO_SCRAPE_KEY,
} from '../utils/automation-settings.utils';

const DEMO_LEADS = [
    {
        post_id: 'demo-claimable-linkedin-1',
        platform: 'linkedin',
        url: 'https://www.linkedin.com/feed/update/demo-claimable-1',
        content:
            'Looking for a freelance Next.js developer to rebuild our lead intake dashboard. Budget open for the right person — DM if you have SaaS experience.',
        keyword: 'freelance next.js developer',
        author: {
            id: 'demo-author-1',
            name: 'Priya Menon',
            url: 'https://www.linkedin.com/in/demo-priya',
        },
        posted_at: {
            timestamp: Date.now() - 3_600_000,
            date: new Date(Date.now() - 3_600_000).toISOString(),
            posted_ago_text: '1 hour ago',
        },
        engagement: { likes: 24, comments: 6 },
        email: 'priya.demo@example.com',
        contact_info: { emails: ['priya.demo@example.com'], phones: [] },
        enrichment_status: 'found',
        intelligence:
            'High-intent buying signal: explicit freelance hire ask with SaaS context. Decision-maker likely product/ops lead. Recommend short portfolio + availability outreach.',
    },
    {
        post_id: 'demo-claimable-reddit-1',
        platform: 'reddit',
        url: 'https://www.reddit.com/r/forhire/comments/demo-claimable-1',
        content:
            '[Hiring] Need someone to scrape LinkedIn + Reddit for B2B leads and enrich contacts. Looking for weekly retainer.',
        keyword: 'lead scraping freelancer',
        author: {
            id: 'demo-author-2',
            name: 'u/ops_founder_demo',
            url: 'https://www.reddit.com/user/ops_founder_demo',
        },
        posted_at: {
            timestamp: Date.now() - 7_200_000,
            date: new Date(Date.now() - 7_200_000).toISOString(),
            posted_ago_text: '2 hours ago',
        },
        engagement: { likes: 41, comments: 12 },
        email: 'ops.demo@example.com',
        contact_info: { emails: ['ops.demo@example.com'], phones: ['+15550100100'] },
        enrichment_status: 'found',
        intelligence:
            'Recurring retainer intent for scraping + enrichment. Strong fit for Lead Hunter ICP. Lead with case study on volume and compliance.',
    },
    {
        post_id: 'demo-claimable-twitter-1',
        platform: 'twitter',
        url: 'https://twitter.com/demo/status/demo-claimable-1',
        content:
            'Anyone know a solid agency for outbound to US SaaS founders? Tired of spraying cold emails with zero personalization.',
        keyword: 'outbound agency saas',
        author: {
            id: 'demo-author-3',
            name: 'Alex Rivera',
            url: 'https://twitter.com/demo_alex',
        },
        posted_at: {
            timestamp: Date.now() - 10_800_000,
            date: new Date(Date.now() - 10_800_000).toISOString(),
            posted_ago_text: '3 hours ago',
        },
        engagement: { likes: 18, comments: 9 },
        email: null,
        contact_info: { emails: [], phones: [], linkedin: 'https://www.linkedin.com/in/demo-alex' },
        enrichment_status: 'partial',
        intelligence:
            'Pain: generic outbound failing. Opportunity to sell personalized claim-based outreach. Soft CTA asking for stack + ICP.',
    },
];

async function upsertAutomationDefaults() {
    if (process.env.SEED_ENABLE_AUTO_SCRAPE !== 'true') return;

    for (const [key, description] of [
        [AUTO_SCRAPE_KEY, 'Auto scrape enabled by onboard seed'] as const,
        [AUTO_ENRICHMENT_KEY, 'Auto enrichment enabled by onboard seed'] as const,
    ]) {
        await prisma.setting.upsert({
            where: { key },
            create: { key, value: true as any, description },
            update: { value: true as any, is_deleted: false, description },
        });
        console.log(`✔ Setting ${key}=true`);
    }
}

async function main() {
    console.log('Seeding claimable demo leads...');

    let created = 0;
    let updated = 0;

    for (const lead of DEMO_LEADS) {
        const existing = await prisma.leadPost.findUnique({
            where: {
                post_id_platform: {
                    post_id: lead.post_id,
                    platform: lead.platform,
                },
            },
        });

        const data = {
            url: lead.url,
            content: lead.content,
            keyword: lead.keyword,
            author: lead.author as any,
            posted_at: lead.posted_at as any,
            engagement: lead.engagement as any,
            email: lead.email,
            contact_info: lead.contact_info as any,
            enrichment_status: lead.enrichment_status,
            status: 'relevant',
            review_status: 'approved',
            reviewed_at: new Date(),
            intelligence: lead.intelligence,
            source: 'seed',
            ai_score: 90,
            is_deleted: false,
        };

        if (existing) {
            await prisma.leadPost.update({
                where: { id: existing.id },
                data,
            });
            updated += 1;
            console.log(`↻ Updated ${lead.platform}/${lead.post_id}`);
        } else {
            await prisma.leadPost.create({
                data: {
                    post_id: lead.post_id,
                    platform: lead.platform,
                    ...data,
                },
            });
            created += 1;
            console.log(`✔ Created ${lead.platform}/${lead.post_id}`);
        }
    }

    await upsertAutomationDefaults();

    console.log(`Done. created=${created} updated=${updated}`);
}

main()
    .catch((err) => {
        console.error('❌ seed-claimable-leads failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
