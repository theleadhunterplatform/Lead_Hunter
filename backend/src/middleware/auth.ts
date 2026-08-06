import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import config from '../config';
import axios from 'axios';
import prisma from '../lib/prisma';

import { getUserPermissions, hasPermission } from '../utils/rbac.utils';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'lead-hunter-club';

// ── Firebase public key cache (keys rotate every 6h, cache for 5h) ──────────
interface KeyCache {
    keys: Record<string, string>;
    expiresAt: number;
}
let firebaseKeyCache: KeyCache | null = null;

async function getFirebasePublicKeys(): Promise<Record<string, string>> {
    const now = Date.now();
    if (firebaseKeyCache && now < firebaseKeyCache.expiresAt) {
        return firebaseKeyCache.keys;
    }

    const { data: keys } = await axios.get(
        'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
        { timeout: 5000 }
    );

    // Cache for 5 hours
    firebaseKeyCache = { keys, expiresAt: now + 5 * 60 * 60 * 1000 };
    return keys;
}

// Verify Firebase ID token using cached Google public keys
async function verifyFirebaseToken(token: string): Promise<{ uid: string; email?: string; name?: string } | null> {
    try {
        const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
        const kid = header.kid;

        const keys = await getFirebasePublicKeys();
        if (!keys[kid]) return null;

        const decoded = jwt.verify(token, keys[kid], {
            algorithms: ['RS256'],
            audience: FIREBASE_PROJECT_ID,
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
        }) as any;

        return {
            uid: decoded.uid || decoded.sub,
            email: decoded.email,
            name: decoded.name,
        };
    } catch (err: any) {
        return null;
    }
}

// Find or create user from Firebase identity
// firebase_uid stored as supabase_user_id to tie Firebase identity to DB user
async function findOrCreateFirebaseUser(firebaseUser: { uid: string; email?: string; name?: string }) {
    if (!firebaseUser.email) return null;

    // 1. Try to find by Firebase UID first (most secure)
    let user = await User.findOne({ supabase_user_id: firebaseUser.uid });

    // 2. Fall back to email lookup
    if (!user) {
        user = await User.findOne({ email: firebaseUser.email.toLowerCase() });
    }

    if (!user) {
        // Create new user — link Firebase UID via supabase_user_id field
        await prisma.user.create({
            data: {
                name: firebaseUser.name || firebaseUser.email.split('@')[0],
                email: firebaseUser.email.toLowerCase(),
                password: '', // Firebase users never use password login
                supabase_user_id: firebaseUser.uid, // tie to Firebase UID
                status: 'active',
                is_active: true,
                plan: 'free',
                tokens: 10,
            },
        });
        user = await User.findOne({ email: firebaseUser.email.toLowerCase() });
    } else if (!user.supabase_user_id) {
        // Backfill Firebase UID on existing user
        await prisma.user.update({
            where: { id: user.id || user._id },
            data: { supabase_user_id: firebaseUser.uid },
        });
    }

    return user;
}

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

    // Try our own JWT first
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
    } catch (jwtErr: any) {
        // Not our JWT — try Firebase token
    }

    // Try Firebase token
    try {
        const firebaseUser = await verifyFirebaseToken(token);
        if (!firebaseUser) {
            return res.status(401).json({ message: 'Not authorized to access this route' });
        }

        const user = await findOrCreateFirebaseUser(firebaseUser);
        if (!user) {
            return res.status(401).json({ message: 'Could not resolve user from Firebase token' });
        }

        if (!user.is_active || user.is_deleted) {
            return res.status(401).json({ message: 'User no longer exists or is disabled' });
        }

        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Account pending admin approval' });
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
