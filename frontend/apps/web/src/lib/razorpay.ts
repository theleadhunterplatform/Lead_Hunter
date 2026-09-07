import Razorpay from 'razorpay'

let cachedClient: Razorpay | null = null

export function getRazorpay(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
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
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_WEBHOOK_SECRET
  )
}

export function verifyRazorpaySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  return Razorpay.validateWebhookSignature(body, signature, secret)
}
