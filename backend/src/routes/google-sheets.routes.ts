import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
    disconnectGoogleSheets,
    exportGoogleSheets,
    getGoogleSheetsConnectUrl,
    getGoogleSheetsStatus,
    handleGoogleSheetsCallback,
    saveGoogleSheetsConfig,
} from '../controllers/google-sheets.controller';

const router = Router();

router.get('/callback', handleGoogleSheetsCallback);

router.use(protect);
router.get('/connect', authorize('lead:read'), getGoogleSheetsConnectUrl);
router.get('/status', authorize('lead:read'), getGoogleSheetsStatus);
router.post('/config', authorize('lead:read'), saveGoogleSheetsConfig);
router.post('/export', authorize('lead:read'), exportGoogleSheets);
router.post('/disconnect', authorize('lead:read'), disconnectGoogleSheets);

export default router;
