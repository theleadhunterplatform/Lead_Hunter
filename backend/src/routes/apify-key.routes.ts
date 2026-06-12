import express from 'express';
import {
    getApifyKeys,
    getApifyKey,
    addApifyKey,
    updateApifyKey,
    deleteApifyKey
} from '../controllers/apify-key.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createApifyKeySchema, updateApifyKeySchema } from '../schemas/apify-key.schema';

const router = express.Router();

router.use(protect);
router.use(authorize('scraping:manage')); // Only users with scraping:manage can handle tokens

/**
 * @swagger
 * tags:
 *   name: ApifyKeys
 *   description: Management of Apify API tokens
 */

/**
 * @swagger
 * /api/apify-keys:
 *   get:
 *     summary: Get all Apify keys
 *     tags: [ApifyKeys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of keys
 *   post:
 *     summary: Create/Add a new Apify key
 *     tags: [ApifyKeys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key]
 *             properties:
 *               key: { type: string }
 *               label: { type: string }
 *               is_active: { type: boolean }
 *     responses:
 *       201:
 *         description: Key added
 */
router.route('/')
    .get(getApifyKeys)
    .post(validate(createApifyKeySchema), addApifyKey);

/**
 * @swagger
 * /api/apify-keys/{id}:
 *   get:
 *     summary: Get single Apify key details
 *     tags: [ApifyKeys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Key details
 *   put:
 *     summary: Update an Apify key
 *     tags: [ApifyKeys]
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
 *               key: { type: string }
 *               label: { type: string }
 *               is_active: { type: boolean }
 *     responses:
 *       200:
 *         description: Key updated
 *   delete:
 *     summary: Delete an Apify key
 *     tags: [ApifyKeys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Key removed
 */
router.route('/:id')
    .get(getApifyKey)
    .put(validate(updateApifyKeySchema), updateApifyKey)
    .delete(authorize('scraping:delete'), deleteApifyKey);

export default router;
