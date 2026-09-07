import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export interface AuditLogEntry {
  userId: string
  adminId: string
  action: 'STATUS_CHANGE' | 'CREDIT_CHANGE'
  targetType: string
  targetId: string
  details?: Prisma.InputJsonValue
}

export const auditService = {
  async log(entry: AuditLogEntry) {
    return db.auditLog.create({
      data: {
        userId: entry.userId,
        adminId: entry.adminId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        details: entry.details ?? {},
      },
    })
  },
}
