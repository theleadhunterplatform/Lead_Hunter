export type AuthProvider = 'google' | 'github' | 'email' | 'phone'

export type UserRole = 'admin' | 'user'

export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'

export interface CreditAccountInfo {
  subscriptionBalance: number
  bonusBalance: number
  rolloverBalance: number
  rolloverExpiresAt: string | null
  total: number
  renewalDate: string | null
}

export interface User {
  id: string
  email: string
  name: string
  phone?: string | null
  avatarUrl?: string
  role: UserRole
  creditAccount: CreditAccountInfo
  provider: AuthProvider
  emailVerified: string | null
  plan: string
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
  stripeCurrentPeriodEnd?: string | null
  status?: string
  hasCompletedOnboarding?: boolean
  createdAt: string
  updatedAt: string
}
