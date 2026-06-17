import express from 'express';
import {
    addTarget,
    deleteTarget,
    getTarget,
    getTargets,
    scrapeAllTargets,
    scrapeTarget,
    updateTarget,
} from '../controllers/target.controller';
import { authorize, protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTargetSchema, updateTargetSchema } from '../schemas/target.schema';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('target:read'), getTargets)
    .post(authorize('target:create'), validate(createTargetSchema), addTarget);

router.post('/scrape-all', authorize('target:update'), scrapeAllTargets);
router.post('/:id/scrape', authorize('target:update'), scrapeTarget);

router.route('/:id')
    .get(authorize('target:read'), getTarget)
    .put(authorize('target:update'), validate(updateTargetSchema), updateTarget)
    .delete(authorize('target:delete'), deleteTarget);

export default router;
