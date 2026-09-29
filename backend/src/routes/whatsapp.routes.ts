import express from 'express';
import { protect } from '../middleware/auth';
import { requirePlatformAdmin } from '../middleware/platform-admin';
import {
    getWhatsAppStatusHandler,
    getWhatsAppGroupsHandler,
    sendWhatsAppTestMessageHandler,
    triggerLeadDropAlertHandler,
    reconnectWhatsAppHandler,
} from '../controllers/whatsapp.controller';

const router = express.Router();

// Protected admin routes
router.use(protect, requirePlatformAdmin);

router.get('/status', getWhatsAppStatusHandler);
router.get('/groups', getWhatsAppGroupsHandler);
router.post('/test', sendWhatsAppTestMessageHandler);
router.post('/alert', triggerLeadDropAlertHandler);
router.post('/reconnect', reconnectWhatsAppHandler);

export default router;
