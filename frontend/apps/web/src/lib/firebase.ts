import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  EmailAuthProvider,
  applyActionCode,
  updateProfile,
  type User as FirebaseUser,
  type ConfirmationResult,
} from 'firebase/auth'
import { getAnalytics, isSupported } from 'firebase/analytics'

function validateFirebaseConfig(): void {
  const required: [string, string | undefined][] = [
    ['NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY],
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID],
    ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET],
    [
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    ],
    ['NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID],
  ]

  const missing = required.filter(([_, val]) => !val).map(([name]) => name)
  if (missing.length > 0) {
    throw new Error(
      `Firebase config missing: ${missing.join(', ')}. Set these environment variables.`,
    )
  }
}

validateFirebaseConfig()

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

import { getStorage } from 'firebase/storage'
import type { Auth } from 'firebase/auth'

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Lazy Auth: avoid getAuth() (and Firebase's apis.google.com auth iframe)
// on marketing pages until auth is actually needed.
let _auth: Auth | null = null
function ensureAuth(): Auth {
  if (!_auth) _auth = getAuth(app)
  return _auth
}

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    // React Refresh / tooling inspects exports (e.g. $$typeof) at load time.
    // Never initialize Auth for those probes — it loads apis.google.com + 3P cookies.
    if (typeof prop === 'symbol' || prop === 'then' || prop.startsWith('$$')) {
      return undefined
    }
    const instance = ensureAuth()
    const value = Reflect.get(instance, prop, instance) as unknown
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(instance)
    }
    return value
  },
  set(_target, prop, value) {
    if (typeof prop === 'symbol' || prop === 'then' || prop.startsWith('$$')) {
      return true
    }
    return Reflect.set(ensureAuth(), prop, value)
  },
  has(_target, prop) {
    if (typeof prop === 'symbol' || prop === 'then' || prop.startsWith('$$')) {
      return false
    }
    return Reflect.has(ensureAuth(), prop)
  },
}) as Auth

const storage = getStorage(app)

export async function getAnalyticsInstance() {
  if (typeof window !== 'undefined' && (await isSupported())) {
    return getAnalytics(app)
  }
  return null
}

export async function linkPhoneToEmailAccount(phoneNumber: string): Promise<{
  verifier: RecaptchaVerifier
  confirmationResult: ConfirmationResult
}> {
  const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier)
  return { verifier, confirmationResult }
}

export async function linkEmailToPhoneAccount(email: string, password: string): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('No authenticated user to link to')
  const credential = EmailAuthProvider.credential(email, password)
  await linkWithCredential(user, credential)
}

export async function getFirebaseToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  if (!auth.currentUser && typeof auth.authStateReady === 'function') {
    try {
      await Promise.race([
        auth.authStateReady(),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ])
    } catch {
      // Continue if authStateReady fails or times out
    }
  }

  const user = auth.currentUser
  if (!user) return null
  try {
    return await user.getIdToken()
  } catch {
    return null
  }
}

export {
  app,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  EmailAuthProvider,
  applyActionCode,
  updateProfile,
  storage,
}
export type { FirebaseUser, ConfirmationResult }
