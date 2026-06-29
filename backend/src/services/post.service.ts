import prisma from '../lib/prisma';
import LeadPost from '../models/lead-post.model';
import User from '../models/user.model';
import Claim from '../models/claim.model';
import ErrorResponse from '../utils/error-response.utils';
import { getSetting } from './setting.service';
import { getUserPermissions, hasPermission as checkPermission } from '../utils/rbac.utils';
import { scheduleAutoTrain } from '../utils/auto-train.utils';
import { enqueueLeadQualification } from '../utils/qualification-queue.utils';
import { findExistingLeadPost, isDuplicateKeyError } from '../utils/lead-dedup.utils';
import { enqueueContactEnrichment } from '../utils/enrichment-queue.utils';
import { requestLeadIntelligence } from '../utils/intelligence-queue.utils';
import { sanitizeContactFields } from '../utils/contact-redaction.utils';
import { logLeadAction } from '../utils/audit.utils';
import { verifyLeadEmailManually } from './lead-enrichment.service';
import { reconcileEnrichmentStatusIfStale, shouldEnrichLead } from './enrichment.service';
import { isManuallyLabeled } from '../utils/training-label.utils';
import { isAutoEnrichmentEnabled } from '../utils/automation-settings.utils';
import {
    leadHasContactDetails,
} from '../utils/lead-enrichment.utils';

function applyListTabFilter(filter: any, status?: string) {
    if (!status || status === 'all') return;

    if (status === 'review') {
        filter.status = 'relevant';
        filter.review_status = 'awaiting_review';
        filter.has_contact = true;
        return;
    }

    if (status === 'approved') {
        filter.status = 'relevant';
        filter.review_status = 'approved';
        return;
    }

    if (status === 'with_contact') {
        filter.status = 'relevant';
        filter.has_contact = true;
        return;
    }

    if (status === 'relevant') {
        filter.status = 'relevant';
        return;
    }

    filter.status = status;
}

function buildLeadListFilter(query: {
    status?: string;
    search?: string;
    keyword?: string;
    platform?: string;
}) {
    const filter: any = { is_deleted: false };
    applyListTabFilter(filter, query.status);

    if (query.keyword) {
        filter.keyword = query.keyword;
    }

    if (query.platform && query.platform !== 'all') {
        const platforms = query.platform.split(',').map((p) => p.trim()).filter(Boolean);
        if (platforms.length > 0) {
            filter.platform = { $in: platforms };
        }
    }

    if (query.search) {
        filter.$or = [
            { 'author.name': { $regex: query.search, $options: 'i' } },
            { 'author.handle': { $regex: query.search, $options: 'i' } },
            { content: { $regex: query.search, $options: 'i' } },
            { keyword: { $regex: query.search, $options: 'i' } },
        ];
    }

    return filter;
}

export const bulkRequalifyPosts = async (query: {
    status?: string;
    search?: string;
    keyword?: string;
    platform?: string;
}) => {
    const filter = buildLeadListFilter(query);
    const posts = await LeadPost.find(filter, { lean: true }) as Array<{
        _id: string;
        qualification_reason?: string | null;
    }>;

    if (posts.length === 0) {
        return { queued: 0, message: 'No leads matched the current filters.' };
    }

    const eligible = posts.filter((post) => !isManuallyLabeled(post.qualification_reason));
    const skipped = posts.length - eligible.length;

    if (eligible.length === 0) {
        return {
            queued: 0,
            skipped,
            message: 'All matching leads were manually labeled and were skipped.',
        };
    }

    const ids = eligible.map((post) => post._id.toString());

    await prisma.leadPost.updateMany({
        where: { id: { in: ids } },
        data: {
            status: 'pending',
            qualification_reason: null,
            ai_score: 0,
            review_status: null,
            reviewed_at: null,
            reviewed_by_id: null,
        },
    });

    for (const id of ids) {
        await enqueueLeadQualification(id, { force: true });
    }

    return {
        queued: ids.length,
        skipped,
        message:
            skipped > 0
                ? `${ids.length} lead(s) queued for re-analysis. ${skipped} manual label(s) skipped.`
                : `${ids.length} lead(s) queued for re-analysis.`,
    };
};

export const bulkReEnrichPosts = async (query: {
    status?: string;
    search?: string;
    keyword?: string;
    platform?: string;
}) => {
    const filter = buildLeadListFilter(query);
    filter.status = 'relevant';

    const enrichablePlatforms = ['linkedin', 'threads', 'twitter', 'reddit'];
    if (filter.platform?.$in) {
        filter.platform.$in = filter.platform.$in.filter((platform: string) =>
            enrichablePlatforms.includes(platform)
        );
        if (filter.platform.$in.length === 0) {
            return { queued: 0, message: 'No enrichable leads matched the current filters.' };
        }
    } else {
        filter.platform = { $in: enrichablePlatforms };
    }

    const posts = await LeadPost.find(filter, { lean: true }) as Array<{ _id: string; platform?: string }>;

    if (posts.length === 0) {
        return { queued: 0, message: 'No enrichable leads matched the current filters.' };
    }

    let queued = 0;
    for (const post of posts) {
        const added = await enqueueContactEnrichment(post._id.toString(), {
            status: 'relevant',
            platform: post.platform,
        }, { force: true });
        if (added) queued += 1;
    }

    return {
        queued,
        message: `${queued} lead(s) queued for contact re-enrichment.`,
    };
};

export const reEnrichPost = async (id: string) => {
    const post = await LeadPost.findOne({ _id: id, is_deleted: false });
    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    if (!shouldEnrichLead(post)) {
        throw new ErrorResponse('Contact enrichment only runs for qualified LinkedIn, Threads, X, or Reddit leads.', 400);
    }

    const added = await enqueueContactEnrichment(
        post._id.toString(),
        { status: 'relevant', platform: post.platform },
        { force: true }
    );

    if (!added) {
        throw new ErrorResponse('This lead cannot be enriched.', 400);
    }

    await LeadPost.findByIdAndUpdate(id, {
        enrichment_status: 'searching',
        enrichment_message: null,
    });

    return { message: 'Contact enrichment queued.' };
};

async function attachReviewerNames(posts: any[]) {
    const reviewerIds = [...new Set(
        posts.map((post) => post.reviewed_by_id).filter(Boolean)
    )] as string[];

    if (reviewerIds.length === 0) {
        return posts.map((post) => ({ ...post, reviewed_by_name: null }));
    }

    const reviewers = await prisma.user.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, name: true, email: true },
    });
    const reviewerMap = new Map(
        reviewers.map((user) => [user.id, user.name || user.email || 'Admin'])
    );

    return posts.map((post) => ({
        ...post,
        reviewed_by_name: post.reviewed_by_id ? reviewerMap.get(post.reviewed_by_id) || 'Admin' : null,
    }));
}

export const approveLeadReview = async (
    id: string,
    reviewerId: string,
    audit?: { ipAddress?: string; organizationId?: string }
) => {
    const post = await LeadPost.findOne({ _id: id, is_deleted: false });
    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    if (post.status !== 'relevant') {
        throw new ErrorResponse('Only AI-qualified relevant leads can be approved for release.', 400);
    }

    if (post.review_status === 'approved') {
        throw new ErrorResponse('This lead is already approved.', 400);
    }

    if (!leadHasContactDetails(post)) {
        throw new ErrorResponse(
            'Cannot approve: no contact details found yet. Run enrichment and wait for an email or phone before approving.',
            400
        );
    }

    const updated = await LeadPost.findByIdAndUpdate(id, {
        review_status: 'approved',
        reviewed_at: new Date(),
        reviewed_by_id: reviewerId,
        is_training_data: true,
    });

    if (!updated.intelligence) {
        await requestLeadIntelligence(id);
    }

    scheduleAutoTrain().catch((err) => console.error('[AutoTrain] Schedule failed:', err.message));

    await logLeadAction(reviewerId, {
        action: 'lead.review.approve',
        resource: 'lead_post',
        resourceId: id,
        organizationId: audit?.organizationId,
        ipAddress: audit?.ipAddress,
        details: {
            post_id: post.post_id,
            platform: post.platform,
            keyword: post.keyword,
        },
    });

    return updated;
};

export const rejectLeadReview = async (
    id: string,
    reviewerId: string,
    audit?: { ipAddress?: string; organizationId?: string }
) => {
    const post = await LeadPost.findOne({ _id: id, is_deleted: false });
    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    const updated = await LeadPost.findByIdAndUpdate(id, {
        status: 'irrelevant',
        review_status: 'rejected',
        qualification_reason: 'Rejected during admin review.',
        is_training_data: true,
        reviewed_at: new Date(),
        reviewed_by_id: reviewerId,
    });

    scheduleAutoTrain().catch((err) => console.error('[AutoTrain] Schedule failed:', err.message));

    await logLeadAction(reviewerId, {
        action: 'lead.review.reject',
        resource: 'lead_post',
        resourceId: id,
        organizationId: audit?.organizationId,
        ipAddress: audit?.ipAddress,
        details: {
            post_id: post.post_id,
            platform: post.platform,
            keyword: post.keyword,
        },
    });

    return updated;
};

export const regenerateLeadIntelligence = async (id: string) => {
    const post = await LeadPost.findOne({ _id: id, is_deleted: false });
    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    if (post.status !== 'relevant') {
        throw new ErrorResponse('Only relevant leads can generate intelligence reports.', 400);
    }

    if (!leadHasContactDetails(post)) {
        throw new ErrorResponse('Add contact details before generating intelligence.', 400);
    }

    const result = await requestLeadIntelligence(id, { force: true });
    const refreshed = await LeadPost.findById(id);

    return {
        post: refreshed || post,
        mode: result.mode,
    };
};

export const bulkApproveLeadReviews = async (
    query: {
        status?: string;
        search?: string;
        keyword?: string;
        platform?: string;
    },
    reviewerId: string,
    audit?: { ipAddress?: string; organizationId?: string }
) => {
    const filter = buildLeadListFilter(query);
    filter.status = 'relevant';
    filter.review_status = 'awaiting_review';
    filter.has_contact = true;

    const posts = await LeadPost.find(filter, { lean: true }) as Array<{
        _id: string;
        intelligence?: string;
        email?: string | null;
        enrichment_status?: string | null;
        contact_info?: { emails?: Array<{ email?: string }>; phone_numbers?: Array<{ number?: string }> };
    }>;

    if (posts.length === 0) {
        return { approved: 0, skipped: 0, message: 'No leads awaiting approval with contact details matched the current filters.' };
    }

    const withContact = posts.filter((post) => leadHasContactDetails(post));
    const skipped = posts.length - withContact.length;

    if (withContact.length === 0) {
        return {
            approved: 0,
            skipped,
            message: `${skipped} lead(s) skipped — none have contact details yet. Run enrichment first.`,
        };
    }

    const ids = withContact.map((post) => post._id.toString());

    await prisma.leadPost.updateMany({
        where: { id: { in: ids } },
        data: {
            review_status: 'approved',
            reviewed_at: new Date(),
            reviewed_by_id: reviewerId,
            is_training_data: true,
        },
    });

    let approved = 0;
    for (const post of withContact) {
        if (!post.intelligence) {
            try {
                await requestLeadIntelligence(post._id.toString());
            } catch (err: any) {
                console.warn(`[BulkApprove] Intel queue failed for ${post._id}:`, err?.message || err);
            }
        }
        approved += 1;
    }

    scheduleAutoTrain().catch((err) => console.error('[AutoTrain] Schedule failed:', err.message));

    await logLeadAction(reviewerId, {
        action: 'lead.review.bulk_approve',
        resource: 'lead_post',
        organizationId: audit?.organizationId,
        ipAddress: audit?.ipAddress,
        details: { count: approved, skipped, filters: query },
    });

    const skipNote = skipped > 0 ? ` ${skipped} skipped (no contact details).` : '';

    return {
        approved,
        skipped,
        message: `${approved} lead(s) approved and queued for intelligence reports.${skipNote}`,
    };
};

export const bulkApproveLeadReviewsByIds = async (
    ids: string[],
    reviewerId: string,
    audit?: { ipAddress?: string; organizationId?: string }
) => {
    const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
    if (uniqueIds.length === 0) {
        throw new ErrorResponse('No lead IDs provided', 400);
    }

    const posts = await LeadPost.find(
        {
            _id: { $in: uniqueIds },
            is_deleted: false,
            status: 'relevant',
            review_status: 'awaiting_review',
        },
        { lean: true }
    ) as Array<{
        _id: string;
        intelligence?: string;
        email?: string | null;
        enrichment_status?: string | null;
        contact_info?: { emails?: Array<{ email?: string }>; phone_numbers?: Array<{ number?: string }> };
    }>;

    const withContact = posts.filter((post) => leadHasContactDetails(post));
    const skipped = uniqueIds.length - withContact.length;

    if (withContact.length === 0) {
        return {
            approved: 0,
            skipped: uniqueIds.length,
            message: 'No selected leads could be approved — they must be awaiting review with contact details.',
        };
    }

    const approveIds = withContact.map((post) => post._id.toString());

    await prisma.leadPost.updateMany({
        where: { id: { in: approveIds } },
        data: {
            review_status: 'approved',
            reviewed_at: new Date(),
            reviewed_by_id: reviewerId,
            is_training_data: true,
        },
    });

    for (const post of withContact) {
        if (!post.intelligence) {
            try {
                await requestLeadIntelligence(post._id.toString());
            } catch (err: any) {
                console.warn(`[BulkApprove] Intel queue failed for ${post._id}:`, err?.message || err);
            }
        }
    }

    scheduleAutoTrain().catch((err) => console.error('[AutoTrain] Schedule failed:', err.message));

    await logLeadAction(reviewerId, {
        action: 'lead.review.bulk_approve',
        resource: 'lead_post',
        organizationId: audit?.organizationId,
        ipAddress: audit?.ipAddress,
        details: { count: withContact.length, skipped, ids: approveIds },
    });

    const skipNote = skipped > 0 ? ` ${skipped} skipped (not awaiting approval or missing contact).` : '';

    return {
        approved: withContact.length,
        skipped,
        message: `${withContact.length} selected lead(s) approved.${skipNote}`,
    };
};

export const bulkDeletePosts = async (
    ids: string[],
    reviewerId: string,
    audit?: { ipAddress?: string; organizationId?: string }
) => {
    const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
    if (uniqueIds.length === 0) {
        throw new ErrorResponse('No lead IDs provided', 400);
    }

    const posts = await LeadPost.find(
        { _id: { $in: uniqueIds }, is_deleted: false },
        { lean: true }
    ) as Array<{ _id: string; post_id: string; platform: string; keyword: string }>;

    if (posts.length === 0) {
        return { deleted: 0, message: 'No matching leads found to delete.' };
    }

    const deleteIds = posts.map((post) => post._id.toString());

    await prisma.leadPost.updateMany({
        where: { id: { in: deleteIds } },
        data: {
            is_deleted: true,
            deleted_at: new Date(),
        },
    });

    await logLeadAction(reviewerId, {
        action: 'lead.bulk_delete',
        resource: 'lead_post',
        organizationId: audit?.organizationId,
        ipAddress: audit?.ipAddress,
        details: { count: deleteIds.length, ids: deleteIds },
    });

    return {
        deleted: deleteIds.length,
        message: `${deleteIds.length} lead(s) deleted.`,
    };
};

export const bulkRejectLeadReviews = async (
    query: {
        status?: string;
        search?: string;
        keyword?: string;
        platform?: string;
    },
    reviewerId: string,
    audit?: { ipAddress?: string; organizationId?: string }
) => {
    const filter = buildLeadListFilter(query);
    filter.status = 'relevant';
    filter.review_status = 'awaiting_review';

    const posts = await LeadPost.find(filter, { lean: true }) as Array<{ _id: string }>;

    if (posts.length === 0) {
        return { rejected: 0, message: 'No leads awaiting review matched the current filters.' };
    }

    const ids = posts.map((post) => post._id.toString());

    await prisma.leadPost.updateMany({
        where: { id: { in: ids } },
        data: {
            status: 'irrelevant',
            review_status: 'rejected',
            qualification_reason: 'Rejected during bulk admin review.',
            is_training_data: true,
            reviewed_at: new Date(),
            reviewed_by_id: reviewerId,
        },
    });

    scheduleAutoTrain().catch((err) => console.error('[AutoTrain] Schedule failed:', err.message));

    await logLeadAction(reviewerId, {
        action: 'lead.review.bulk_reject',
        resource: 'lead_post',
        organizationId: audit?.organizationId,
        ipAddress: audit?.ipAddress,
        details: { count: ids.length, filters: query },
    });

    return {
        rejected: ids.length,
        message: `${ids.length} lead(s) rejected and moved to noise.`,
    };
};

export const getAllPosts = async (currentUser: any, query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    keyword?: string;
    platform?: string;
}) => {
    // Check for lead access enabled (feature flag)
    if (!currentUser.lead_access_enabled) {
        const perms = await getUserPermissions(currentUser.id, currentUser.organization?.toString());
        if (!checkPermission(perms, 'lead:read')) {
            throw new ErrorResponse('Not authorized to access leads.', 403);
        }
    }

    const permissions = await getUserPermissions(currentUser.id, currentUser.organization?.toString());
    const isInternal = checkPermission(permissions, '*') || checkPermission(permissions, 'system:admin');

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { is_deleted: false };

    // Security Filter: External users only see admin-approved leads with intelligence
    if (!isInternal) {
        filter.status = 'relevant';
        filter.review_status = 'approved';
        filter.intelligence = { $ne: null };
    } else if (query.status && query.status !== 'all') {
        applyListTabFilter(filter, query.status);
    }

    // Keyword filter
    if (query.keyword) {
        filter.keyword = query.keyword;
    }

    // Platform filter
    if (query.platform && query.platform !== 'all') {
        const platforms = query.platform.split(',').map(p => p.trim());
        if (platforms.length > 0) {
            filter.platform = { $in: platforms };
        }
    }

    // Search logic (author name, content, or keyword)
    if (query.search) {
        filter.$or = [
            { 'author.name': { $regex: query.search, $options: 'i' } },
            { 'author.handle': { $regex: query.search, $options: 'i' } },
            { content: { $regex: query.search, $options: 'i' } },
            { keyword: { $regex: query.search, $options: 'i' } }
        ];
    }

    const posts = await LeadPost.find(filter, {
        sort: { created_at: -1 },
        skip,
        limit,
        lean: true,
    });

    const postsWithReviewers = await attachReviewerNames(posts);

    if (isInternal) {
        await Promise.all(
            postsWithReviewers.map(async (post) => {
                const corrected = await reconcileEnrichmentStatusIfStale(post._id.toString(), post);
                if (corrected) post.enrichment_status = corrected;
            })
        );
    }

    // Check which posts are claimed by the current user
    const userClaims = await Claim.find({ userId: currentUser.id, leadId: { $in: postsWithReviewers.map(p => p._id) } });
    const claimedIds = new Set(userClaims.map(c => c.leadId.toString()));

    const postsWithClaimed = postsWithReviewers.map(post => {
        const isClaimed = claimedIds.has(post._id.toString());
        const shouldShowSensitive = isClaimed || isInternal;
        const contact = sanitizeContactFields(post, { isInternal, isClaimed });

        // Base redaction
        const redactedPost = {
            ...post,
            is_claimed: isClaimed,
            content: shouldShowSensitive ? post.content : "Original signal locked. This high-relevance lead has been verified by the Intelligence Engine. Claim this lead to unlock the full original post and contact data.",
            email: contact.email,
            contact_info: contact.contact_info,
            // Redact author details to prevent direct outreach bypass
            author: shouldShowSensitive ? post.author : {
                name: `Strategic Lead [${post.platform.toUpperCase()}]`,
                handle: "locked",
                url: "#",
                avatar: { url: "" }
            },
            // Redact all direct outbound URLs
            url: shouldShowSensitive ? post.url : "#"
        };

        // Deep redaction for any other direct links (like course URLs or profile links in raw data)
        if (!shouldShowSensitive) {
            delete redactedPost.raw_result; // Never show raw scraped data to external users for unclaimed leads
            if (redactedPost.source_profile) redactedPost.source_profile = "locked";
        }

        return redactedPost;
    });

    const total = await LeadPost.countDocuments(filter);
    
    // For status counts, always use the base filter but respect isInternal for showing pending counts
    const baseFilter = { ...filter };
    delete baseFilter.status;
    delete baseFilter.review_status;
    delete baseFilter.intelligence;
    delete baseFilter.enrichment_status;
    delete baseFilter.has_contact;

    const reviewFilter = {
        ...baseFilter,
        status: 'relevant',
        review_status: 'awaiting_review',
        has_contact: true,
    };

    const [allCount, irrelevantCount, relevantCount, withContactCount, approvedCount, pendingCount, reviewCount] =
        await Promise.all([
            LeadPost.countDocuments(baseFilter),
            LeadPost.countDocuments({ ...baseFilter, status: 'irrelevant' }),
            LeadPost.countDocuments({ ...baseFilter, status: 'relevant' }),
            LeadPost.countDocuments({ ...baseFilter, status: 'relevant', has_contact: true }),
            LeadPost.countDocuments({ ...baseFilter, status: 'relevant', review_status: 'approved' }),
            LeadPost.countDocuments({ ...baseFilter, status: 'pending' }),
            LeadPost.countDocuments(reviewFilter),
        ]);

    return {
        posts: postsWithClaimed,
        total,
        page,
        pages: Math.ceil(total / limit),
        counts: {
            all: allCount,
            irrelevant: isInternal ? irrelevantCount : 0,
            relevant: isInternal ? relevantCount : 0,
            with_contact: isInternal ? withContactCount : 0,
            approved: approvedCount,
            pending: isInternal ? pendingCount : 0,
            review: isInternal ? reviewCount : 0,
        }
    };
};

export const getPostById = async (id: string) => {
    const post = await LeadPost.findOne({ _id: id, is_deleted: false }, { lean: true });
    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    return post;
};

export const getPostForUser = async (currentUser: any, id: string) => {
    const post = await getPostById(id);
    
    // Check if claimed
    const isClaimed = await Claim.exists({ userId: currentUser.id, leadId: id });
    
    const permissions = await getUserPermissions(currentUser.id, currentUser.organization?.toString());
    const isInternal = checkPermission(permissions, '*') || checkPermission(permissions, 'system:admin');
    const shouldShowSensitive = !!isClaimed || isInternal;
    const contact = sanitizeContactFields(post, { isInternal, isClaimed: !!isClaimed });

    const redactedPost = {
        ...post,
        is_claimed: !!isClaimed,
        content: shouldShowSensitive ? post.content : "Original signal locked. This high-relevance lead has been verified by the Intelligence Engine. Claim this lead to unlock the full original post and contact data.",
        email: contact.email,
        contact_info: contact.contact_info,
        author: shouldShowSensitive ? post.author : {
            name: `Strategic Lead [${post.platform.toUpperCase()}]`,
            handle: "locked",
            url: "#",
            avatar: { url: "" }
        },
        url: shouldShowSensitive ? post.url : "#"
    };

    if (!shouldShowSensitive) {
        delete redactedPost.raw_result;
        if (redactedPost.source_profile) redactedPost.source_profile = "locked";
    }

    return redactedPost;
};
export const updatePostLabel = async (
    id: string,
    data: { status?: string; is_training_data?: boolean },
    reviewerId?: string
) => {
    const updateData: any = { ...data };

    if (data.status === 'relevant') {
        updateData.qualification_reason = 'Manually marked as a good lead by admin.';
        updateData.is_training_data = true;
    } else if (data.status === 'irrelevant') {
        updateData.qualification_reason = 'Manually marked as not a lead by admin.';
        updateData.is_training_data = true;
        updateData.review_status = 'rejected';
        updateData.reviewed_at = new Date();
        if (reviewerId) updateData.reviewed_by_id = reviewerId;
    } else if (data.status === 'pending') {
        updateData.qualification_reason = null;
        updateData.ai_score = 0;
        updateData.review_status = null;
        updateData.reviewed_at = null;
        updateData.reviewed_by_id = null;
    }

    const post = await LeadPost.findOneAndUpdate(
        { _id: id, is_deleted: false },
        updateData,
        { returnDocument: 'after', runValidators: true }
    );

    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    if (data.status === 'relevant') {
        const hasContact = leadHasContactDetails(post);
        if (hasContact) {
            await LeadPost.findByIdAndUpdate(post._id.toString(), {
                review_status: 'approved',
                reviewed_at: new Date(),
                reviewed_by_id: reviewerId || null,
            });
            post.review_status = 'approved';
        } else {
            await LeadPost.findByIdAndUpdate(post._id.toString(), {
                review_status: 'awaiting_review',
                reviewed_at: null,
                reviewed_by_id: null,
            });
            post.review_status = 'awaiting_review';
        }
    }

    if (data.status === 'relevant' || data.status === 'irrelevant') {
        scheduleAutoTrain({ force: true }).catch((err) => console.error('[AutoTrain] Schedule failed:', err.message));
    }

    if (data.status === 'relevant') {
        if (shouldEnrichLead(post) && !leadHasContactDetails(post)) {
            await LeadPost.findByIdAndUpdate(post._id.toString(), {
                enrichment_status: 'pending',
                enrichment_message: null,
            });
            post.enrichment_status = 'pending';

            if (await isAutoEnrichmentEnabled()) {
                await enqueueContactEnrichment(post._id.toString(), {
                    status: 'relevant',
                    platform: post.platform,
                });
            }
        }

        if (leadHasContactDetails(post) && !post.intelligence) {
            await requestLeadIntelligence(post._id.toString());
        }
    }

    return post;
};

export const requalifyPost = async (id: string) => {
    const post = await LeadPost.findOne({ _id: id, is_deleted: false }, { lean: true }) as {
        qualification_reason?: string | null;
    } | null;
    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    if (isManuallyLabeled(post.qualification_reason)) {
        throw new ErrorResponse('This lead was manually labeled. Change the label instead of re-analysing.', 400);
    }

    await LeadPost.findByIdAndUpdate(id, {
        status: 'pending',
        qualification_reason: null,
        ai_score: 0,
        review_status: null,
        reviewed_at: null,
        reviewed_by_id: null,
    });
    await enqueueLeadQualification(id);

    return { message: 'Lead queued for AI qualification' };
};

export const updatePost = async (id: string, data: any) => {
    const post = await LeadPost.findOneAndUpdate(
        { _id: id, is_deleted: false },
        data,
        { returnDocument: 'after', runValidators: true }
    );

    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    return post;
};

export const verifyLeadEmail = async (id: string) => verifyLeadEmailManually(id);

export const createManualPost = async (data: {
    content: string;
    keyword: string;
    authorName?: string;
    imageUrl?: string;
    platform?: 'linkedin' | 'twitter' | 'reddit' | 'manual';
}) => {
    const platform = data.platform || 'manual';

    const existing = await findExistingLeadPost({
        platform,
        url: null,
        content: data.content,
    });
    if (existing) {
        return existing;
    }

    // Generate a unique ID for manual posts
    const postId = `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
        const post = await LeadPost.create({
        post_id: postId,
        url: 'manual://' + postId, // Mock URL for manual entries
        content: data.content,
        platform,
        author: {
            name: data.authorName || 'Manual Entry',
            id: 'manual',
            url: '#'
        },
        posted_at: {
            timestamp: Date.now(),
            date: new Date(),
            posted_ago_short: 'Just now',
            posted_ago_text: 'Manually added'
        },
        engagement: {
            likes: 0,
            comments: 0,
            shares: 0
        },
        keyword: data.keyword,
        status: 'pending',
        source: 'manual',
        image_url: data.imageUrl,
        is_training_data: true,
        ai_score: 0,
    });

    if (post?._id) {
        await enqueueLeadQualification(post._id.toString());
    }

    return post;
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            const dup = await findExistingLeadPost({ platform, content: data.content });
            if (dup) return dup;
        }
        throw error;
    }
};

export const deletePost = async (id: string) => {
    const post = await LeadPost.findById(id);

    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    // Soft delete - explicitly cast to any to avoid Mongoose/TS hydration issues in this specific environment
    const postDoc = post as any;
    postDoc.is_deleted = true;
    postDoc.deleted_at = new Date();
    await postDoc.save();

    return post;
};

export const claimPost = async (postId: string, userId: string) => {
    const post = await LeadPost.findOne({ _id: postId, is_deleted: false });
    if (!post) {
        throw new ErrorResponse('Lead not found.', 404);
    }

    const permissions = await getUserPermissions(userId);
    const isInternal = checkPermission(permissions, '*') || checkPermission(permissions, 'system:admin');

    // Ensure it's actually a lead approved for release
    if (
        post.status !== 'relevant'
        || post.review_status !== 'approved'
        || (!isInternal && !post.intelligence)
    ) {
        throw new ErrorResponse('Only admin-approved leads with generated intelligence can be claimed.', 400);
    }

    // 1. Check if lead already claimed by this user
    const existingClaim = await Claim.findOne({ userId, leadId: postId });
    if (existingClaim) {
        throw new ErrorResponse('You have already claimed this lead.', 400);
    }

    // 2. Check claim limit
    const limitSetting = await getSetting('max_claims_per_lead');
    const maxClaims = limitSetting ? Number(limitSetting) : 25;

    if (post.claimed_count >= maxClaims) {
        throw new ErrorResponse(`This lead has reached its maximum claim limit (${maxClaims} users).`, 400);
    }

    // 3. Check user roles and tokens
    const user = await User.findById(userId);
    if (!user) {
        throw new ErrorResponse('User not found.', 404);
    }

    // Token deduction logic
    const tokenCost = isInternal ? 0 : 1; 
    
    if (user.tokens < tokenCost) {
        throw new ErrorResponse('Insufficient tokens to claim this lead.', 403);
    }

    // 4. Perform atomic-ish operations
    if (tokenCost > 0) {
        user.tokens -= tokenCost;
        await user.save();
    }

    // Create claim
    const claim = await Claim.create({
        userId: userId as any,
        leadId: postId as any,
        token_cost: tokenCost
    } as any);

    // Update lead claim count
    post.claimed_count += 1;
    await post.save();

    return {
        post,
        claim,
        remaining_tokens: user.tokens
    };
};

export const getClaimedPosts = async (userId: string, query: { page?: number; limit?: number; orgId?: string }) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { userId };
    
    // If orgId is provided, show all claims for that organization
    if (query.orgId) {
        const orgUsers = await prisma.user.findMany({
            where: { organizationId: query.orgId },
            select: { id: true },
        });
        const userIds = orgUsers.map((u) => u.id);
        delete filter.userId;
        filter.userId = { $in: userIds };
    }

    const claims = await Claim.find(filter, {
        sort: { createdAt: -1 },
        skip,
        limit,
        populate: 'leadId',
    });

    const total = await Claim.countDocuments({ userId });
    
    return {
        posts: claims,
        total,
        page,
        pages: Math.ceil(total / limit)
    };
};
