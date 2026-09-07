function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'The application will not start without this variable set.',
    )
  }
  return value
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}

export const env = {
  // Firebase Client (public)
  firebaseApiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  firebaseAuthDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  firebaseProjectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  firebaseStorageBucket: requireEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  firebaseMessagingSenderId: requireEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  firebaseAppId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  firebaseMeasurementId: optionalEnv('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', ''),

  // Firebase Admin (server-side)
  firebaseServiceAccountKey: optionalEnv('FIREBASE_SERVICE_ACCOUNT_KEY', ''),
  firebaseServiceAccountPath: optionalEnv('FIREBASE_SERVICE_ACCOUNT_PATH', ''),

  // Payments (Stripe + Razorpay — both optional, at least one must be configured)
  stripeSecretKey: optionalEnv('STRIPE_SECRET_KEY', ''),
  stripeWebhookSecret: optionalEnv('STRIPE_WEBHOOK_SECRET', ''),
  razorpayKeyId: optionalEnv('RAZORPAY_KEY_ID', ''),
  razorpayKeySecret: optionalEnv('RAZORPAY_KEY_SECRET', ''),
  razorpayWebhookSecret: optionalEnv('RAZORPAY_WEBHOOK_SECRET', ''),

  // Database
  databaseUrl: requireEnv('DATABASE_URL'),
  directUrl: optionalEnv('DIRECT_URL', ''),

  // External Lead API
  externalApiBaseUrl: requireEnv('NEXT_PUBLIC_API_URL'),
  externalApiEmail: requireEnv('EXTERNAL_API_EMAIL'),
  externalApiPassword: requireEnv('EXTERNAL_API_PASSWORD'),

  // Email (Resend for transactional, Brevo for marketing/newsletter)
  resendApiKey: requireEnv('RESEND_API_KEY'),
  brevoApiKey: optionalEnv('BREVO_API_KEY', ''),
  emailFrom: optionalEnv('EMAIL_FROM', 'noreply@leadhunterclub.com'),
  brevoSenderName: optionalEnv('BREVO_SENDER_NAME', 'Lead Hunter Club'),
  adminNotificationEmail: optionalEnv('ADMIN_NOTIFICATION_EMAIL', ''),

  // Admin
  adminRegistrationKey: optionalEnv('ADMIN_REGISTRATION_KEY', ''),

  // App
  appUrl: optionalEnv('NEXT_PUBLIC_APP_URL', 'https://leadhunterclub.com'),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),

  // External AI APIs (optional — fallback to simulated responses)
  openaiApiKey: optionalEnv('OPENAI_API_KEY', ''),
  anthropicApiKey: optionalEnv('ANTHROPIC_API_KEY', ''),
  geminiApiKey: optionalEnv('GEMINI_API_KEY', ''),

  // Rate Limiting (Upstash Redis - optional, falls back to in-memory)
  upstashRedisRestUrl: optionalEnv('UPSTASH_REDIS_REST_URL', ''),
} as const

export type Env = typeof env
