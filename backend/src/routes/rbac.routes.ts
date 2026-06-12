import express from 'express';
import {
    getRoles,
    createRole,
    updateRole,
    createRoleAssignment,
    getRoleAssignments,
    deleteRoleAssignment,
    getMyPermissions
} from '../controllers/rbac.controller';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// All routes are protected and restricted to system admins for management
// Note: actual permission checks use authorize('permission:string')
router.use(protect);

// Roles Management
router.route('/roles')
    .get(authorize('role:read'), getRoles)
    .post(authorize('role:create'), createRole);

router.route('/roles/:id')
    .put(authorize('role:update'), updateRole);

router.get('/my-permissions', getMyPermissions);

// Role Assignments
router.route('/role-assignments')
    .get(authorize('role:assign'), getRoleAssignments)
    .post(authorize('role:assign'), createRoleAssignment);

router.route('/role-assignments/:id')
    .delete(authorize('role:assign'), deleteRoleAssignment);

export default router;
