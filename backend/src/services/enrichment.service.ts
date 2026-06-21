import LeadPost from '../models/lead-post.model';
import { findLeadEmail } from './lead-enrichment.service';
import ErrorResponse from '../utils/error-response.utils';
import { isVerifiedEmailStatus } from '../utils/lead-enrichment.utils';

export type EnrichmentStatus =
    | 'pending'
    | 'searching'
    | 'found'
    | 'partial'
    | 'not_found'
    | 'skipped'
    | 'failed';

export interface EnrichmentResult {
    success: boolean;
    status: EnrichmentStatus;
    message?: string;
    data?: any;
}

export function resolveEnrichmentStatus(lead: any): EnrichmentStatus {
    // Terminal outcomes: not_found | partial (contact found, unverified) | found (verified)
    const emails = lead.contact_info?.emails as Array<{ email?: string; email_status?: string }> | undefined;
    const hasEmail = Boolean(lead.email?.trim()) || Boolean(emails?.some((e) => e.email?.trim()));
    const hasPhone = Boolean(lead.contact_info?.phone_numbers?.some((p: { number?: string }) => p.number?.trim()));

    if (!hasEmail && !hasPhone) return 'not_found';

    if (emails?.some((e) => isVerifiedEmailStatus(e.email_status))) return 'found';
    if (lead.email && isVerifiedEmailStatus(lead.contact_info?.email_status)) return 'found';

    return 'partial';
}

async function seedAuthorContactInfo(postId: string) {
    const lead = await LeadPost.findById(postId);
    if (!lead) return;

    const author = lead.author || {};
    let publicId = lead.contact_info?.linkedin_public_id;

    if (!publicId) {
        const urls = [author.url, lead.url].filter(Boolean) as string[];
        for (const url of urls) {
            const match = url.match(/linkedin\.com\/in\/([^/?#]+)/);
            if (match) {
                publicId = match[1];
                break;
            }
        }
    }

    if (!publicId && !author.name) return;

    await LeadPost.findByIdAndUpdate(postId, {
        contact_info: {
            ...lead.contact_info,
            name: lead.contact_info?.name || author.name,
            linkedin_public_id: publicId || lead.contact_info?.linkedin_public_id,
            headline: lead.contact_info?.headline || author.info,
        },
    });
}

export function shouldEnrichLead(lead: { status?: string; platform?: string }) {
    return lead.status === 'relevant' && (lead.platform === 'linkedin' || lead.platform === 'threads');
}

export async function enrichLeadPost(postId: string, options?: { force?: boolean }): Promise<EnrichmentResult> {
    const lead = await LeadPost.findById(postId);
    if (!lead) {
        throw new ErrorResponse('Lead not found', 404);
    }

    if (!shouldEnrichLead(lead)) {
        return {
            success: false,
            status: 'skipped',
            message: 'Contact enrichment only runs for qualified LinkedIn or Threads leads.',
        };
    }

    if (!options?.force && lead.enrichment_status === 'found' && lead.email) {
        return {
            success: true,
            status: 'found',
            data: lead,
            message: 'Lead already has verified contact information.',
        };
    }

    await seedAuthorContactInfo(postId);
    await LeadPost.findByIdAndUpdate(postId, {
        enrichment_status: 'searching',
        enrichment_message: null,
    });

    console.log(`📇 [Enrichment] Searching contacts for post: ${lead.post_id}${options?.force ? ' (re-enrich)' : ''}`);

    try {
        const result = await findLeadEmail(postId, { force: options?.force });
        const updated = result.data || await LeadPost.findById(postId);
        const status = resolveEnrichmentStatus(updated);

        await LeadPost.findByIdAndUpdate(postId, {
            enrichment_status: status,
            enrichment_message: result.message || null,
            enriched_at: new Date(),
        });

        console.log(`✅ [Enrichment] ${lead.post_id} → ${status}${updated?.email ? ` (${updated.email})` : ''}`);

        return {
            success: status === 'found' || status === 'partial',
            status,
            data: updated,
            message: result.message,
        };
    } catch (error: any) {
        await seedAuthorContactInfo(postId);
        const refreshed = await LeadPost.findById(postId);
        const status = resolveEnrichmentStatus(refreshed);
        const message = error.message || 'Contact enrichment failed';

        const finalStatus: EnrichmentStatus =
            status === 'partial'
                ? 'partial'
                : message.includes('not configured') || message.includes('public ID')
                    ? 'skipped'
                    : 'not_found';

        await LeadPost.findByIdAndUpdate(postId, {
            enrichment_status: finalStatus,
            enrichment_message: message,
            enriched_at: new Date(),
        });

        console.warn(`⚠️ [Enrichment] ${lead.post_id} → ${finalStatus}: ${message}`);

        return {
            success: finalStatus === 'partial',
            status: finalStatus,
            data: refreshed,
            message,
        };
    }
}

const RECONCILABLE_STATUSES = new Set(['partial', 'found', 'not_found']);

/** Fix leads stored with stale partial/found when no email or phone exists. */
export async function reconcileEnrichmentStatusIfStale(postId: string, lead?: any): Promise<EnrichmentStatus | null> {
    const record = lead || (await LeadPost.findById(postId));
    if (!record?.enrichment_status || !RECONCILABLE_STATUSES.has(record.enrichment_status)) {
        return null;
    }

    const correct = resolveEnrichmentStatus(record);
    if (correct === record.enrichment_status) return null;

    await LeadPost.findByIdAndUpdate(postId, { enrichment_status: correct });
    return correct;
}
