import express from 'express';
import {
    register,
    login,
    getMe,
    refresh,
    getOrganizationUsers,
    addOrganizationUser,
    toggleUserAccess,
    deactivateOrganizationUser,
    getOrganizations,
    forgotPassword,
    resetPassword,
    changePassword,
} from '../controllers/auth.controller';
import { supabaseLogin } from '../controllers/auth.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../schemas/auth.schema';
import { authRateLimiter } from '../middleware/auth-rate-limit';

const router = express.Router();

router.use(authRateLimiter);

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/supabase', supabaseLogin);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', protect, getMe);
router.post('/refresh', refresh);
router.post('/change-password', protect, validate(changePasswordSchema), changePassword);

// Organization Management
router.get('/organizations', protect, getOrganizations);
router.get('/organization/users', protect, authorize('user:read'), getOrganizationUsers);
router.post('/organization/users', protect, authorize('user:create'), addOrganizationUser);
router.put('/organization/users/:id/access', protect, authorize('user:update'), toggleUserAccess);
router.delete('/organization/users/:id', protect, authorize('user:update'), deactivateOrganizationUser);

export default router;
