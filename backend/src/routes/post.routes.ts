import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    getPosts,
    getPost,
    deletePost,
    labelPost,
    uploadManualPost,
    updatePost,
    reExtractPost,
    bulkIngestPosts,
    claimPost,
    getClaimedPosts,
    qualifyPost,
    verifyEmailPost,
    bulkRequalifyPosts,
    bulkReEnrichPosts,
    reEnrichPost,
    approveLeadReview,
    rejectLeadReview,
    bulkApproveLeadReviews,
    bulkRejectLeadReviews,
    regenerateLeadIntelligencePost,
} from '../controllers/post.controller';
import { findLeadEmail } from '../controllers/contact.controller';
import { getLeadIntelligenceStats } from '../controllers/dashboard.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { labelPostSchema } from '../schemas/post.schema';

const router = express.Router();

// Public Extension Routes (No Auth for local dev)
router.post('/bulk-ingest', bulkIngestPosts);

router.use(protect);

// Multer Configuration
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        cb(null, `lead-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Images only (jpeg, jpg, png)'));
        }
    }
});

router.use(protect);

/**
 * @swagger
 * /api/posts/upload:
 *   post:
 *     summary: Upload multiple manual leads via Images (OCR)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images: 
 *                 type: array
 *                 items: { type: string, format: binary }
 *               keyword: { type: string }
 *               authorName: { type: string }
 *     responses:
 *       201:
 *         description: Manual leads created via OCR
 */
router.post('/upload', authorize('lead:hunt'), upload.array('images'), uploadManualPost);

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Management of scraped LinkedIn posts
 */

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of posts
 */
router.route('/')
    .get(authorize('lead:read'), getPosts);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get single post details
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post details
 *   delete:
 *     summary: Delete a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post removed
 */
router.get('/claimed', authorize('lead:read'), getClaimedPosts);
router.get('/stats', authorize('lead:read'), getLeadIntelligenceStats);
router.post('/bulk-reanalyse', authorize('lead:hunt'), bulkRequalifyPosts);
router.post('/bulk-re-enrich', authorize('lead:hunt'), bulkReEnrichPosts);
router.post('/:id/re-enrich', authorize('lead:hunt'), reEnrichPost);
router.post('/bulk-approve', authorize('lead:hunt'), bulkApproveLeadReviews);
router.post('/bulk-reject', authorize('lead:hunt'), bulkRejectLeadReviews);

router.route('/:id')
    .get(authorize('lead:read'), getPost)
    .delete(authorize('lead:hunt'), deletePost);

router.post('/:id/claim', authorize('lead:read'), claimPost);
router.post('/:id/qualify', authorize('lead:hunt'), qualifyPost);
router.post('/:id/approve', authorize('lead:hunt'), approveLeadReview);
router.post('/:id/reject-review', authorize('lead:hunt'), rejectLeadReview);
router.put('/:id/label', authorize('lead:hunt'), validate(labelPostSchema), labelPost);
router.put('/:id', authorize('lead:hunt'), updatePost);
router.post('/:id/re-extract', authorize('lead:hunt'), reExtractPost);
router.post('/:id/find-email', authorize('lead:hunt'), findLeadEmail);
router.post('/:id/verify-email', authorize('lead:hunt'), verifyEmailPost);
router.post('/:id/generate-intelligence', authorize('lead:hunt'), regenerateLeadIntelligencePost);

export default router;
