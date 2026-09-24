import Razorpay from 'razorpay'

let cachedClient: Razorpay | null = null

export const DEFAULT_RAZORPAY_KEY_ID = 'rzp_test_SxYOJz74qr94Pt'
export const DEFAULT_RAZORPAY_KEY_SECRET = 'TT86QwQm86efbc7l6sv7V209'

export function getRazorpay(): Razorpay {
  const rawKeyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    DEFAULT_RAZORPAY_KEY_ID
  const rawKeySecret =
    process.env.RAZORPAY_KEY_SECRET ||
    DEFAULT_RAZORPAY_KEY_SECRET

  const keyId = rawKeyId?.replace(/['"]/g, '').trim()
  const keySecret = rawKeySecret?.replace(/['"]/g, '').trim()

  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are required')
  }

  if (!cachedClient) {
    cachedClient = new Razorpay({ key_id: keyId, key_secret: keySecret })
  }
  return cachedClient
}

export function getRazorpayWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET environment variable is required')
  }
  return secret
}

export function isRazorpayConfigured(): boolean {
  return !!(
    (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || DEFAULT_RAZORPAY_KEY_ID) &&
    (process.env.RAZORPAY_KEY_SECRET || DEFAULT_RAZORPAY_KEY_SECRET)
  )
}

export function verifyRazorpaySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  return Razorpay.validateWebhookSignature(body, signature, secret)
}
