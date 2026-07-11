import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import config from '../config';

import { getUserPermissions, hasPermission } from '../utils/rbac.utils';

// Protect routes
export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
        const user = await User.findById(decoded.id);

        if (!user || !user.is_active || user.is_deleted) {
            return res.status(401).json({ message: 'User no longer exists or is disabled' });
        }

        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Account pending admin approval' });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({ message: 'Account signup was rejected' });
        }

        req.user = {
            ...user,
            id: user.id || user._id,
            _id: user._id || user.id,
        };
        return next();
    } catch (err: any) {
        return res.status(401).json({ message: 'Not authorized to access this route' });
    }
};

// Core Enforcement Middleware
export const authorize = (requiredPermission: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as any;
        if (!user) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const orgId = (req.headers['x-org-id'] as string) || null;
        
        try {
            const permissions = await getUserPermissions(user.id, orgId);
            
            // 1. Check direct permission match
            if (hasPermission(permissions, requiredPermission)) {
                
                // 2. LEAD ACCESS SECURITY GATE (Admin defined restriction)
                // If it's a lead permission, also verify lead_access_enabled
                // unless they have platform wildcard permission.
                if (requiredPermission.startsWith('lead:') && !permissions.has('*')) {
                    if (user.lead_access_enabled === false) {
                        return res.status(403).json({
                            success: false,
                            error: 'Access Restricted: Your team manager has disabled your lead access.'
                        });
                    }
                }

                return next();
            }

            return res.status(403).json({ 
                success: false,
                error: `Forbidden: Required permission ${requiredPermission}` 
            });
        } catch (error) {
            console.error('RBAC Authorization Error:', error);
            return res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    };
};
