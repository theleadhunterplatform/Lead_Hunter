import { Router } from 'express';
import { 
    updateClaimStatus, 
    sendEmailToLead, 
    inviteTeamMember 
} from '../controllers/crm.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.use(protect);

// Team management
router.post('/team/invite', authorize('user:create'), inviteTeamMember);

// Pipeline management
router.put('/claims/:id', updateClaimStatus);

// Communication
router.post('/send-email', sendEmailToLead);

export default router;
