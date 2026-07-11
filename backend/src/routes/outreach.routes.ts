import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import { generateOutreach, getOutreach, saveOutreach } from '../controllers/outreach.controller';

const router = Router();

router.use(protect);
router.post('/generate', authorize('lead:read'), generateOutreach);
router.get('/:claimId', authorize('lead:read'), getOutreach);
router.put('/:claimId', authorize('lead:read'), saveOutreach);

export default router;
