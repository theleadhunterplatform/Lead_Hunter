'use server'

import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { verifyIdToken } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { creditService } from '@/lib/services/credits'

async function getServerUserId(): Promise<string | null> {
  const headerList = headers()
  const authHeader = headerList.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  if (!token) return null

  const decoded = await verifyIdToken(token)
  return decoded?.uid || null
}

export async function consumeCredits(amount: number, description: string) {
  const userId = await getServerUserId()

  if (!userId) {
    throw new Error('Authentication required')
  }

  if (amount <= 0) {
    throw new Error('Invalid credit amount')
  }

  try {
    await creditService.deduct(userId, amount, description)

    revalidatePath('/dashboard')
    revalidatePath('/leads')
    revalidatePath('/saved')
    revalidatePath('/settings')

    const balances = await creditService.getBalances(userId)

    return {
      success: true,
      credits: balances.total,
      user: {
        id: userId,
        credits: balances.total,
      },
    }
  } catch (err: any) {
    console.error(`[Credit Deduction Error] Failed to deduct credits: ${err.message}`)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

export async function getUserCredits() {
  const userId = await getServerUserId()

  if (!userId) {
    return { success: false, error: 'Authentication required' }
  }

  try {
    const balances = await creditService.getBalances(userId)

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })

    return {
      success: true,
      credits: balances.total,
      plan: user?.plan || 'FREE',
    }
  } catch (err: any) {
    console.error('[Credit Service] Failed to get user credits:', err.message)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
