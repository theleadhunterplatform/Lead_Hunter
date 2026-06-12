import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { updateToken, getToken } from '../controllers/contact.controller';

const router = express.Router();

router.use(protect);

router.post('/contact-compass-token', authorize('admin'), updateToken);
router.get('/contact-compass-token', authorize('admin'), getToken);

export default router;
