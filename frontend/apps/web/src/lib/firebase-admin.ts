import { verifyFirebaseToken } from './verify-session'

export async function verifyIdToken(token: string) {
  return verifyFirebaseToken(token)
}

export async function getAdminAuthInstance() {
  const { getApps, initializeApp, cert } = await import('firebase-admin/app')
  const { getAuth } = await import('firebase-admin/auth')

  const apps = getApps()
  if (apps.length) return getAuth(apps[0])

  let serviceAccount: any = null

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim()
    try {
      serviceAccount = JSON.parse(raw)
    } catch {
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf-8')
        serviceAccount = JSON.parse(decoded)
      } catch {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is invalid JSON or base64')
      }
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const fs = await import('fs')
    const fileContent = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf-8')
    serviceAccount = JSON.parse(fileContent)
  }

  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_PATH not configured')
  }

  const app = initializeApp({ credential: cert(serviceAccount) })
  return getAuth(app)
}

