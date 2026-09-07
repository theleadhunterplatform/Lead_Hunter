export type AuthProvider = 'google' | 'github' | 'email'

export type UserRole = 'admin' | 'user'

export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: UserRole
  credits: number
  provider: AuthProvider
  emailVerified: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  session: AuthSession
}

export interface TokenBalance {
  remaining: number
  total: number
  percentageUsed: number
}
