import { auth } from '@/lib/firebase'
import { fetchSignInMethodsForEmail } from 'firebase/auth'

export async function checkExistingAccount(email: string): Promise<{
  exists: boolean
  methods: string[]
  email: string
}> {
  const methods = await fetchSignInMethodsForEmail(auth, email)
  return { exists: methods.length > 0, methods, email }
}

export function friendlyAccountExistsError(methods: string[]): string {
  if (methods.includes('phone')) {
    return 'An account with this email already exists. Sign in with your phone number first.'
  }
  if (methods.includes('google.com')) {
    return 'An account with this email already exists. Sign in with Google instead.'
  }
  return 'An account with this email already exists. Try signing in instead.'
}
