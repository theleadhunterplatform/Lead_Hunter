import express from 'express';
import { protect } from '../middleware/auth';
import { requirePlatformAdmin } from '../middleware/platform-admin';
import {
    listPendingSignupUsers,
    approveSignupUser,
    rejectSignupUser,
} from '../controllers/user-approval.controller';
import { adminGrantTokens, adminSetUserPlan } from '../controllers/plan.controller';

const router = express.Router();

router.use(protect, requirePlatformAdmin);

router.get('/users/pending', listPendingSignupUsers);
router.post('/users/:id/approve', approveSignupUser);
router.post('/users/:id/reject', rejectSignupUser);
router.patch('/users/:id/plan', adminSetUserPlan);
router.post('/users/:id/tokens', adminGrantTokens);

export default router;
