/**
 * Run: npx tsx scripts/diagnose-enrichment.ts
 * Requires DATABASE_URL in env (Render Postgres internal URL works from backend shell).
 */
import prisma from '../src/lib/prisma';
import { resolveLinkedInPublicIdFromLead } from '../src/utils/lead-enrichment.utils';

async function main() {
    const relevant = await prisma.leadPost.findMany({
        where: { status: 'relevant', is_deleted: false },
        select: {
            id: true,
            post_id: true,
            platform: true,
            author: true,
            email: true,
            contact_info: true,
            enrichment_status: true,
            enrichment_message: true,
            raw_result: true,
        },
    });

    const withContact = relevant.filter((l) => {
        const ci = l.contact_info as any;
        return Boolean(l.email) || ci?.phone_numbers?.some((p: any) => p?.number?.trim());
    });

    const stats = {
        total_relevant: relevant.length,
        with_contact: withContact.length,
        without_contact: relevant.length - withContact.length,
        enrichment_null: 0,
        enrichment_not_found: 0,
        enrichment_partial_or_found: 0,
        no_author_in_url: 0,
        company_author_url: 0,
        opaque_linkedin_id: 0,
        has_public_identifier_in_raw: 0,
        missing_public_identifier_saved: 0,
        by_source: {} as Record<string, number>,
        top_failure_messages: {} as Record<string, number>,
    };

    for (const lead of relevant) {
        const author = (lead.author || {}) as any;
        const ci = (lead.contact_info || {}) as any;
        const raw = (lead.raw_result || {}) as any;
        const rawAuthor = raw.author || {};

        if (!lead.enrichment_status) stats.enrichment_null++;
        else if (lead.enrichment_status === 'not_found') stats.enrichment_not_found++;
        else if (['partial', 'found'].includes(lead.enrichment_status)) stats.enrichment_partial_or_found++;

        const pid = resolveLinkedInPublicIdFromLead({
            author,
            contact_info: ci,
            url: lead.url,
            raw_result: raw,
        });
        if (!pid) stats.no_author_in_url++;
        if (author.url?.includes('linkedin.com/company/')) stats.company_author_url++;
        if (pid?.startsWith('ACo')) stats.opaque_linkedin_id++;
        if (rawAuthor.publicIdentifier) stats.has_public_identifier_in_raw++;
        if (rawAuthor.publicIdentifier && !ci.linkedin_public_id && !pid?.match(/^[a-z]/i)) {
            stats.missing_public_identifier_saved++;
        }

        const source = ci.email_source || (lead.email ? 'unknown' : 'none');
        stats.by_source[source] = (stats.by_source[source] || 0) + 1;

        if (!withContact.includes(lead) && lead.enrichment_message) {
            const msg = lead.enrichment_message.slice(0, 80);
            stats.top_failure_messages[msg] = (stats.top_failure_messages[msg] || 0) + 1;
        }
    }

    console.log(JSON.stringify(stats, null, 2));
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
