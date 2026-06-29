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
    getOrganizations
} from '../controllers/auth.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/refresh', refresh);

// Organization Management
router.get('/organizations', protect, getOrganizations);
router.get('/organization/users', protect, authorize('user:read'), getOrganizationUsers);
router.post('/organization/users', protect, authorize('user:create'), addOrganizationUser);
router.put('/organization/users/:id/access', protect, authorize('user:update'), toggleUserAccess);
router.delete('/organization/users/:id', protect, authorize('user:update'), deactivateOrganizationUser);

export default router;
