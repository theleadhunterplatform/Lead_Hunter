export interface PaymentRecord {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  createdAt: string
  amount: number
  currency: string
  status: 'SUCCESS' | 'CREDITED'
  itemType: 'plan' | 'topup'
  itemLabel: string
  paymentId: string
  orderId: string
  tokensAdded: number
}

export function formatPaymentLog(log: {
  id: string
  userId: string
  createdAt: Date | string
  details?: any
  user?: { name?: string | null; email?: string | null } | null
}): PaymentRecord {
  const details = (log.details && typeof log.details === 'object' ? log.details : {}) as Record<string, any>
  
  const paymentId = details.paymentId || details.razorpay_payment_id || log.id
  const orderId = details.orderId || details.razorpay_order_id || '—'
  const plan = details.plan ? String(details.plan).toUpperCase() : null
  const packId = details.packId || details.pack
  const tokensAdded = Number(details.addedTokens || details.tokens || 0)

  let itemType: 'plan' | 'topup' = 'plan'
  let itemLabel = 'Subscription'
  let defaultAmount = 999

  if (packId || (!plan && tokensAdded > 0)) {
    itemType = 'topup'
    if (packId === 'starter' || tokensAdded === 500) {
      itemLabel = 'Starter Refill (500 Credits)'
      defaultAmount = 499
    } else if (packId === 'growth' || tokensAdded === 1500) {
      itemLabel = 'Growth Refill (1,500 Credits)'
      defaultAmount = 1199
    } else if (packId === 'scale' || tokensAdded === 3500) {
      itemLabel = 'Scale Refill (3,500 Credits)'
      defaultAmount = 2499
    } else {
      itemLabel = `Credit Top-Up (${tokensAdded} Credits)`
      defaultAmount = Math.max(199, Math.round(tokensAdded * 0.8))
    }
  } else if (plan === 'AGENCY' || plan === 'ENTERPRISE') {
    itemLabel = 'Agency Plan Subscription'
    defaultAmount = 2499
  } else if (plan === 'FREELANCER' || plan === 'PAID') {
    itemLabel = 'Freelancer Plan Subscription'
    defaultAmount = 999
  } else if (plan) {
    itemLabel = `${plan} Plan Subscription`
    defaultAmount = 999
  }

  const rawAmount = typeof details.amount === 'number' ? details.amount : defaultAmount

  return {
    id: log.id,
    userId: log.userId,
    userName: log.user?.name || undefined,
    userEmail: log.user?.email || undefined,
    createdAt: typeof log.createdAt === 'string' ? log.createdAt : log.createdAt.toISOString(),
    amount: rawAmount,
    currency: details.currency || 'INR',
    status: 'SUCCESS',
    itemType,
    itemLabel: details.packName || itemLabel,
    paymentId,
    orderId,
    tokensAdded,
  }
}
