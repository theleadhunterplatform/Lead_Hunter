import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const isProduction = process.env.NODE_ENV === 'production'

function getOptimizedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '5')
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '10')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isProduction ? ['error'] : ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: getOptimizedDatabaseUrl(),
      },
    },
  })

globalForPrisma.prisma = db

