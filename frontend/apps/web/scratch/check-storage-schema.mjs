import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const buckets = await prisma.$queryRawUnsafe('SELECT * FROM storage.buckets')
    console.log('Supabase storage buckets:', buckets)
  } catch (e) {
    console.log('Storage check:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
