import express from 'express';
import {
    getKeywords,
    getKeyword,
    addKeyword,
    updateKeyword,
    deleteKeyword,
    addBulkKeywords,
    updateBulkKeywords,
    deleteBulkKeywords
} from '../controllers/keyword.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createKeywordSchema, updateKeywordSchema } from '../schemas/keyword.schema';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Keywords
 *   description: Management of search keywords
 */

/**
 * @swagger
 * /api/keywords:
 *   get:
 *     summary: Get all search keywords
 *     tags: [Keywords]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of keywords
 *   post:
 *     summary: Create a new search keyword
 *     tags: [Keywords]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string }
 *     responses:
 *       201:
 *         description: Keyword created
 */
router.route('/')
    .get(authorize('keyword:read'), getKeywords)
    .post(authorize('keyword:create'), validate(createKeywordSchema), addKeyword);

router.route('/bulk')
    .post(authorize('keyword:create'), addBulkKeywords)
    .put(authorize('keyword:update'), updateBulkKeywords)
    .delete(authorize('keyword:delete'), deleteBulkKeywords);

/**
 * @swagger
 * /api/keywords/{id}:
 *   get:
 *     summary: Get single keyword details
 *     tags: [Keywords]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Keyword details
 *   put:
 *     summary: Update a keyword
 *     tags: [Keywords]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Keyword updated
 *   delete:
 *     summary: Delete a keyword
 *     tags: [Keywords]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Keyword removed
 */
router.route('/:id')
    .get(authorize('keyword:read'), getKeyword)
    .put(authorize('keyword:update'), validate(updateKeywordSchema), updateKeyword)
    .delete(authorize('keyword:delete'), deleteKeyword);

export default router;
