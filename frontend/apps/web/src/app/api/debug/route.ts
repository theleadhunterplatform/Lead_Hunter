import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: any = {
    env: {
      FIREBASE_SERVICE_ACCOUNT_KEY_exists: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      FIREBASE_SERVICE_ACCOUNT_KEY_length: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length ?? 0,
      FIREBASE_SERVICE_ACCOUNT_PATH_exists: !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    },
    checks: {} as Record<string, unknown>,
  }

  // Step 1: Parse service account JSON
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    results.checks['loadServiceAccount'] = 'MISSING: FIREBASE_SERVICE_ACCOUNT_KEY is not set'
    return NextResponse.json(results)
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
    results.checks['parseJSON'] = 'OK'
    results.checks['parsedKeys'] = Object.keys(parsed)
    results.checks['project_id'] = parsed.project_id
    results.checks['has_private_key'] = !!(parsed as Record<string, unknown>).private_key
    results.checks['private_key_starts_with'] = ((parsed as Record<string, unknown>).private_key as string)?.substring(0, 30)
  } catch (e) {
    results.checks['parseJSON'] = 'FAILED: ' + (e instanceof Error ? e.message : String(e))
    return NextResponse.json(results)
  }

  // Step 2: Try initializing Firebase Admin
  try {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app')
    const { getAuth } = await import('firebase-admin/auth')

    const apps = getApps()
    const app = apps.length ? apps[0] : initializeApp({ credential: cert(parsed as any) })
    const auth = getAuth(app)
    results.checks['initAdmin'] = 'OK'
    results.checks['isSingleton'] = apps.length > 0
  } catch (e) {
    results.checks['initAdmin'] = 'FAILED: ' + (e instanceof Error ? e.message : String(e))
  }

  return NextResponse.json(results)
}
