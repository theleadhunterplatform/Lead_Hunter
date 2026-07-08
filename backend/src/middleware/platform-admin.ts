import { Request, Response, NextFunction } from 'express';
import { getUserPermissions, hasPermission } from '../utils/rbac.utils';

/** Platform-wide admins only (system_owner / internal_user), not org admins. */
export const requirePlatformAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user) {
        return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    try {
        const permissions = await getUserPermissions(user.id || user._id);
        if (hasPermission(permissions, '*') || hasPermission(permissions, 'system:admin')) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: 'Platform admin access required',
        });
    } catch (error) {
        console.error('Platform admin check failed:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
