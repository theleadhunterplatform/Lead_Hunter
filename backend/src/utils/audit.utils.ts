import AuditLog from '../models/audit-log.model';
import { Request } from 'express';
import { isValidId } from './serialize.utils';

interface LogOptions {
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    status?: 'success' | 'failure';
}

/**
 * Logs a platform action for audit purposes
 */
export async function logAction(req: Request, options: LogOptions) {
    try {
        const user = (req as any).user;
        const orgId = req.headers['x-org-id'] as string || null;
        
        // Ensure orgId is a valid ObjectId if present
        const organizationId = orgId && isValidId(orgId) ? orgId : undefined;

        // Handle ipAddress as string
        const xForwardedFor = req.headers['x-forwarded-for'];
        const ipAddress = Array.isArray(xForwardedFor) ? xForwardedFor[0] : (xForwardedFor || req.ip || '');

        await AuditLog.create({
            actorId: user?._id || user?.id,
            action: options.action,
            resource: options.resource,
            resourceId: options.resourceId,
            organizationId,
            details: options.details,
            status: options.status || 'success',
            ipAddress
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // We don't throw here to avoid breaking the main request flow
    }
}
