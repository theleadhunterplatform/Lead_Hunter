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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)

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
  auth,
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
}
export type { FirebaseUser, ConfirmationResult }
