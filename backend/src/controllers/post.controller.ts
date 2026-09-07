import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import prisma from '../lib/prisma';
import * as postService from '../services/post.service';
import { extractTextFromImage, cleanExtractedText } from '../services/ocr.service';
import { enqueueLeadTitling } from '../utils/title-queue.utils';
import { applyLeadTitle } from '../services/titling.service';

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
export const getPosts = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { page, limit, status, search, keyword, platform } = req.query;
    
    const result = await postService.getAllPosts(req.user as any, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as string,
        search: search as string,
        keyword: keyword as string,
        platform: platform as string
    });

    return res.status(200).json({
        success: true,
        count: result.posts.length,
        total: result.total,
        page: result.page,
        pages: result.pages,
        counts: result.counts,
        data: result.posts
    });
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
export const getPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const post = await postService.getPostForUser(req.user as any, req.params.id as string);

    return res.status(200).json({
        success: true,
        data: post
    });
});

// @desc    Delete post (Soft Delete)
// @route   DELETE /api/posts/:id
// @access  Private
export const deletePost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    await postService.deletePost(req.params.id as string);

    return res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Label post (Update status or training data)
// @route   PUT /api/posts/:id/label
// @access  Private
export const labelPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const post = await postService.updatePostLabel(
        req.params.id as string,
        req.body,
        (req.user as any)?.id || (req.user as any)?._id
    );

    return res.status(200).json({
        success: true,
        data: post
    });
});

export const approveLeadReview = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = req.user as any;
    const orgId = req.headers['x-org-id'] as string | undefined;
    const post = await postService.approveLeadReview(
        req.params.id as string,
        user.id || user._id,
        { organizationId: orgId, ipAddress: req.ip }
    );

    return res.status(200).json({
        success: true,
        data: post,
        message: 'Lead approved. Intelligence report generation queued.',
    });
});

export const regenerateLeadIntelligencePost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await postService.regenerateLeadIntelligence(req.params.id as string);

    return res.status(200).json({
        success: true,
        data: result.post,
        mode: result.mode,
        message:
            result.mode === 'queued'
                ? 'Intelligence report generation queued.'
                : result.mode === 'inline'
                  ? 'Intelligence report generated.'
                  : 'Intelligence report already exists.',
    });
});

export const rejectLeadReview = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = req.user as any;
    const orgId = req.headers['x-org-id'] as string | undefined;
    const post = await postService.rejectLeadReview(
        req.params.id as string,
        user.id || user._id,
        { organizationId: orgId, ipAddress: req.ip }
    );

    return res.status(200).json({
        success: true,
        data: post,
        message: 'Lead rejected and moved to noise.',
    });
});

export const bulkApproveLeadReviews = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = req.user as any;
    const orgId = req.headers['x-org-id'] as string | undefined;
    const { status, search, keyword, platform } = req.body;
    const result = await postService.bulkApproveLeadReviews(
        { status, search, keyword, platform },
        user.id || user._id,
        { organizationId: orgId, ipAddress: req.ip }
    );

    return res.status(202).json({
        success: true,
        approved: result.approved,
        message: result.message,
    });
});

export const bulkRejectLeadReviews = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = req.user as any;
    const orgId = req.headers['x-org-id'] as string | undefined;
    const { status, search, keyword, platform } = req.body;
    const result = await postService.bulkRejectLeadReviews(
        { status, search, keyword, platform },
        user.id || user._id,
        { organizationId: orgId, ipAddress: req.ip }
    );

    return res.status(202).json({
        success: true,
        rejected: result.rejected,
        message: result.message,
    });
});

export const bulkApproveLeadReviewsByIds = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = req.user as any;
    const orgId = req.headers['x-org-id'] as string | undefined;
    const { ids } = req.body ?? {};
    const result = await postService.bulkApproveLeadReviewsByIds(
        Array.isArray(ids) ? ids : [],
        user.id || user._id,
        { organizationId: orgId, ipAddress: req.ip }
    );

    return res.status(202).json({
        success: true,
        approved: result.approved,
        skipped: result.skipped,
        message: result.message,
    });
});

export const bulkDeletePosts = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = req.user as any;
    const orgId = req.headers['x-org-id'] as string | undefined;
    const { ids } = req.body ?? {};
    const result = await postService.bulkDeletePosts(
        Array.isArray(ids) ? ids : [],
        user.id || user._id,
        { organizationId: orgId, ipAddress: req.ip }
    );

    return res.status(200).json({
        success: true,
        deleted: result.deleted,
        message: result.message,
    });
});

// @desc    Update post content/data
// @route   PUT /api/posts/:id
// @access  Private
export const updatePost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const post = await postService.updatePost(req.params.id as string, req.body);

    return res.status(200).json({
        success: true,
        data: post
    });
});

export const qualifyPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await postService.requalifyPost(req.params.id as string);

    return res.status(202).json({
        success: true,
        message: result.message,
    });
});

export const bulkRequalifyPosts = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { status, search, keyword, platform } = req.body;
    const result = await postService.bulkRequalifyPosts({
        status,
        search,
        keyword,
        platform,
    });

    return res.status(202).json({
        success: true,
        queued: result.queued,
        message: result.message,
    });
});

export const bulkReEnrichPosts = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { status, search, keyword, platform } = req.body;
    const result = await postService.bulkReEnrichPosts({
        status,
        search,
        keyword,
        platform,
    });

    return res.status(202).json({
        success: true,
        queued: result.queued,
        message: result.message,
    });
});

export const reEnrichPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await postService.reEnrichPost(req.params.id as string);

    return res.status(202).json({
        success: true,
        message: result.message,
    });
});

export const verifyEmailPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const post = await postService.verifyLeadEmail(req.params.id as string);

    return res.status(200).json({
        success: true,
        data: post,
        message: 'Email marked as verified.',
    });
});

export const setManualLeadContactPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = req.user as any;
    const orgId = req.headers['x-org-id'] as string | undefined;
    const { email, phone, note } = req.body ?? {};

    const post = await postService.setManualLeadContact(
        req.params.id as string,
        { email, phone, note },
        user.id || user._id,
        { organizationId: orgId, ipAddress: req.ip }
    );

    return res.status(200).json({
        success: true,
        data: post,
        message: 'Contact details saved manually. Lead is ready for approval.',
    });
});

// @desc    Re-run OCR extraction using the new AI service
// @route   POST /api/posts/:id/re-extract
// @access  Private
export const reExtractPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const post = await postService.getPostById(req.params.id as string);
    
    if (!post.image_url) {
        res.status(400).json({ success: false, message: 'No source image found for this lead.' });
        return;
    }

    // Resolve the absolute path
    const path = require('path');
    const imagePath = path.join(__dirname, '../../uploads', path.basename(post.image_url));

    console.log(`[Re-Extract] Triggering AI OCR for: ${imagePath}`);
    const ocrResult = await extractTextFromImage(imagePath);
    const cleanedText = cleanExtractedText(ocrResult.text);

    if (!cleanedText || cleanedText.length < 5) {
        res.status(400).json({ success: false, message: 'AI could not extract meaningful text. Manual refinement may still be required.' });
        return;
    }

    // Update Data with AI Insights
    const updateData: any = {
        content: cleanedText,
        source: 'manual'
    };

    if (ocrResult.classification) {
        updateData.status = ocrResult.classification.label;
        updateData.ai_score = Math.round(ocrResult.classification.confidence * 100);
        console.log(`[Re-Extract] AI Classify: ${updateData.status} (${updateData.ai_score}%)`);
    }

    // Update the post with new content
    const updatedPost = await postService.updatePost(req.params.id as string, updateData);

    return res.status(200).json({
        success: true,
        message: 'AI re-extraction successful!',
        data: updatedPost
    });
});

// @desc    Upload multiple manual leads via Images (OCR)
// @route   POST /api/posts/upload
// @access  Private
export const uploadManualPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        res.status(400).json({ success: false, message: 'Please upload at least one image' });
        return;
    }

    const { keyword = 'Manual Bulk Upload', authorName, platform = 'manual' } = req.body;

    // Return immediate response to the client
    res.status(202).json({
        success: true,
        message: `Processing ${files.length} images in the background.`,
        count: files.length
    });

    // Process in background (don't await)
    (async () => {
        console.log(`[Background] Starting OCR for ${files.length} images...`);

        for (const file of files) {
            try {
                // Run OCR with Auto-Classification
                console.log(`[Background] OCR: ${file.originalname}`);
                const ocrResult = await extractTextFromImage(file.path);
                const extracted = cleanExtractedText(ocrResult.text);

                const postData: any = {
                    content: extracted && extracted.length >= 5 ? extracted : 'Manual Extraction Required',
                    keyword: keyword || 'Manual Bulk Upload',
                    authorName: authorName || 'Manual Lead',
                    imageUrl: `/uploads/${file.filename}`,
                    platform: platform
                };

                // Add AI relevancy if available
                if (ocrResult.classification) {
                    postData.status = ocrResult.classification.label;
                    postData.ai_score = Math.round(ocrResult.classification.confidence * 100);
                }

                // Create the manual post
                await postService.createManualPost(postData);
                console.log(`[Background] Saved lead: ${file.originalname} (AI: ${postData.status || 'pending'})`);
            } catch (error: any) {
                console.error(`[Background] Process failed for ${file.originalname}:`, error.message);
            }
        }
        console.log(`[Background] Completed processing ${files.length} images.`);
    })();
});

// @desc    Bulk ingest posts from Chrome Extension
// @route   POST /api/posts/bulk-ingest
// @access  Public (Internal/Extension)
export const bulkIngestPosts = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { posts } = req.body;

    if (!posts || !Array.isArray(posts)) {
        res.status(400).json({ success: false, message: 'Invalid payload: posts array required' });
        return;
    }

    console.log(`[Extension] Bulk Ingesting ${posts.length} posts...`);

    const createdPosts = [];
    for (const postData of posts) {
        try {
            // Map extension data to model schema
            const formattedData = {
                content: postData.content,
                authorName: postData.author?.name || 'LinkedIn User',
                platform: 'linkedin' as 'linkedin',
                keyword: 'Extension Scrape'
            };

            const post = await postService.createManualPost(formattedData);
            createdPosts.push(post);
        } catch (err: any) {
            console.error(`[Extension] Failed to save post:`, err.message);
        }
    }

    return res.status(201).json({
        success: true,
        count: createdPosts.length,
        message: `Successfully ingested ${createdPosts.length} leads from extension.`
    });
});

// @desc    Claim a lead
// @route   POST /api/posts/:id/claim
// @access  Private
export const claimPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const result = await postService.claimPost(req.params.id as string, (req.user as any)._id);

    return res.status(200).json({
        success: true,
        message: 'Lead claimed successfully!',
        data: result.post,
        claim: result.claim,
        remaining_tokens: result.remaining_tokens
    });
});

// @desc    Get claimed leads for current user
// @route   GET /api/posts/claimed
// @access  Private
export const getClaimedPosts = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { page, limit, orgId } = req.query;
    const result = await postService.getClaimedPosts((req.user as any)._id, {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        orgId: orgId as string
    });

    return res.status(200).json({
        success: true,
        count: result.posts.length,
        total: result.total,
        page: result.page,
        pages: result.pages,
        data: result.posts
    });
});

// @desc    Create a single manual lead post with optional contact details
// @route   POST /api/posts/manual
// @access  Private (lead:hunt)
export const createManualLeadPost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { content, keyword, authorName, platform } = req.body ?? {};

    if (!content?.trim()) {
        return res.status(400).json({ success: false, message: 'content is required' });
    }
    if (!keyword?.trim()) {
        return res.status(400).json({ success: false, message: 'keyword is required' });
    }

    const post = await postService.createManualPost({
        content: content.trim(),
        keyword: keyword.trim(),
        authorName: authorName?.trim() || 'Manual Entry',
        platform: platform || 'manual',
    });

    return res.status(201).json({
        success: true,
        data: post,
        message: 'Lead created and queued for qualification.',
    });
});

// @desc    Bulk generate titles for leads without one
// @route   POST /api/posts/bulk-title
// @access  Private (lead:hunt)
export const bulkTitlePosts = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { status, keyword, platform } = req.body ?? {};

    // Find leads without a title
    const filter: any = { is_deleted: false };
    if (status) filter.status = status;
    if (keyword) filter.keyword = { contains: keyword };
    if (platform) filter.platform = platform;

    const posts = await prisma.leadPost.findMany({
        where: { ...filter, title: null },
        select: { id: true },
        take: 200,
    });

    if (posts.length === 0) {
        return res.status(200).json({ success: true, queued: 0, message: 'All leads already have titles.' });
    }

    for (const post of posts) {
        await enqueueLeadTitling(post.id);
    }

    return res.status(202).json({
        success: true,
        queued: posts.length,
        message: `Queued ${posts.length} leads for title generation.`,
    });
});

// @desc    Generate title for single lead
// @route   POST /api/posts/:id/generate-title
// @access  Private (lead:hunt)
export const generateLeadTitlePost = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const id = String(req.params.id);
    await applyLeadTitle(id);
    const post = await postService.getPostById(id);
    return res.status(200).json({
        success: true,
        data: post,
        message: 'Title generated successfully.',
    });
});
