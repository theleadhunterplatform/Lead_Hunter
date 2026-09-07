import { verifyFirebaseToken } from './verify-session'

export async function verifyIdToken(token: string) {
  return verifyFirebaseToken(token)
}

export async function getAdminAuthInstance() {
  const { getApps, initializeApp, cert } = await import('firebase-admin/app')
  const { getAuth } = await import('firebase-admin/auth')

  const apps = getApps()
  if (apps.length) return getAuth(apps[0])

  const jsonFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!jsonFromEnv) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not configured')

  const serviceAccount = JSON.parse(jsonFromEnv)
  const app = initializeApp({ credential: cert(serviceAccount) })
  return getAuth(app)
}
