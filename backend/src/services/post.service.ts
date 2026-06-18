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
import { sanitizeContactFields } from '../utils/contact-redaction.utils';
import { verifyLeadEmailManually } from './lead-enrichment.service';

function buildLeadListFilter(query: {
    status?: string;
    search?: string;
    keyword?: string;
    platform?: string;
}) {
    const filter: any = { is_deleted: false };

    if (query.status && query.status !== 'all') {
        filter.status = query.status;
    }

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
    const posts = await LeadPost.find(filter, { lean: true }) as Array<{ _id: string }>;

    if (posts.length === 0) {
        return { queued: 0, message: 'No leads matched the current filters.' };
    }

    const ids = posts.map((post) => post._id.toString());

    await prisma.leadPost.updateMany({
        where: { id: { in: ids } },
        data: { status: 'pending', qualification_reason: null, ai_score: 0 },
    });

    for (const id of ids) {
        await enqueueLeadQualification(id);
    }

    return {
        queued: ids.length,
        message: `${ids.length} lead(s) queued for re-analysis.`,
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

    const enrichablePlatforms = ['linkedin', 'threads'];
    if (filter.platform?.$in) {
        filter.platform.$in = filter.platform.$in.filter((platform: string) =>
            enrichablePlatforms.includes(platform)
        );
        if (filter.platform.$in.length === 0) {
            return { queued: 0, message: 'No enrichable LinkedIn or Threads leads matched the current filters.' };
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

    // Security Filter: External users only see qualified leads (relevant + intelligence generated)
    if (!isInternal) {
        filter.status = 'relevant';
        filter.intelligence = { $ne: null };
    } else if (query.status && query.status !== 'all') {
        // Internal users can filter by any status
        filter.status = query.status;
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

    // Check which posts are claimed by the current user
    const userClaims = await Claim.find({ userId: currentUser.id, leadId: { $in: posts.map(p => p._id) } });
    const claimedIds = new Set(userClaims.map(c => c.leadId.toString()));

    const postsWithClaimed = posts.map(post => {
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
    delete baseFilter.intelligence; // Intelligence filter only for external listing

    const [allCount, pendingCount, relevantCount, irrelevantCount] = await Promise.all([
        LeadPost.countDocuments(baseFilter),
        LeadPost.countDocuments({ ...baseFilter, status: 'pending' }),
        LeadPost.countDocuments({ ...baseFilter, status: 'relevant' }),
        LeadPost.countDocuments({ ...baseFilter, status: 'irrelevant' })
    ]);

    return {
        posts: postsWithClaimed,
        total,
        page,
        pages: Math.ceil(total / limit),
        counts: {
            all: allCount,
            pending: isInternal ? pendingCount : 0, // External users shouldn't even know pending counts exist
            relevant: relevantCount,
            irrelevant: isInternal ? irrelevantCount : 0
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
export const updatePostLabel = async (id: string, data: { status?: string; is_training_data?: boolean }) => {
    const updateData: any = { ...data };

    if (data.status === 'relevant') {
        updateData.qualification_reason = 'Manually marked as a good lead by admin.';
        updateData.is_training_data = true;
    } else if (data.status === 'irrelevant') {
        updateData.qualification_reason = 'Manually marked as not a lead by admin.';
        updateData.is_training_data = true;
    } else if (data.status === 'pending') {
        updateData.qualification_reason = null;
        updateData.ai_score = 0;
    }

    const post = await LeadPost.findOneAndUpdate(
        { _id: id, is_deleted: false },
        updateData,
        { returnDocument: 'after', runValidators: true }
    );

    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    if (data.status === 'relevant' || data.status === 'irrelevant') {
        scheduleAutoTrain().catch((err) => console.error('[AutoTrain] Schedule failed:', err.message));
    }

    if (data.status === 'relevant') {
        await enqueueContactEnrichment(post._id.toString(), {
            status: 'relevant',
            platform: post.platform,
        });
    }

    return post;
};

export const requalifyPost = async (id: string) => {
    const post = await LeadPost.findOne({ _id: id, is_deleted: false });
    if (!post) {
        throw new ErrorResponse(`Post not found with id of ${id}`, 404);
    }

    await LeadPost.findByIdAndUpdate(id, { status: 'pending', qualification_reason: null, ai_score: 0 });
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

    // Ensure it's actually a lead (qualified post)
    if (post.status !== 'relevant' || (!isInternal && !post.intelligence)) {
        throw new ErrorResponse('Only qualified leads with generated intelligence can be claimed.', 400);
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
