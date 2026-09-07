import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const isProduction = process.env.NODE_ENV === 'production'

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isProduction ? ['error'] : ['query', 'error', 'warn'],
    datasources: isProduction
      ? {
          db: {
            url: process.env.DATABASE_URL,
          },
        }
      : undefined,
  })

if (!isProduction) globalForPrisma.prisma = db
