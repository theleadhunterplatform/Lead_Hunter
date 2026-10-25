import express from 'express';
import {
    getScraperKeys,
    addScraperKey,
    bulkAddScraperKeys,
    updateScraperKey,
    deleteScraperKey,
    bulkDeleteScraperKeys,
    testScraperKey,
} from '../controllers/scraper-key.controller';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('scraping:manage'));

router.post('/:engine/test', testScraperKey);

router.route('/:engine')
    .get(getScraperKeys)
    .post(addScraperKey);

router.post('/:engine/bulk', bulkAddScraperKeys);
router.delete('/:engine/bulk', bulkDeleteScraperKeys);

router.route('/:engine/:id')
    .put(updateScraperKey)
    .delete(deleteScraperKey);

export default router;
