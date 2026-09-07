const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadhunterclub.com'
const APP_DOMAIN = new URL(APP_URL).hostname

const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    'https://apis.google.com',
    'https://www.gstatic.com',
    'https://www.google.com',
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com',
    'https://checkout.razorpay.com',
    "'unsafe-eval'",
    "'unsafe-inline'",
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://www.gstatic.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://*.googleapis.com',
    'https://www.gstatic.com',
    'https://www.google.com',
    'https://*.supabase.co',
    'https://images.unsplash.com',
    'https://cdn.jsdelivr.net',
  ],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://fonts.googleapis.com'],
  'connect-src': [
    "'self'",
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://www.googleapis.com',
    `https://${APP_DOMAIN}`,
    'https://api.resend.com',
    'https://api.openai.com',
    'https://api.anthropic.com',
    'https://api.razorpay.com',
    'https://lumberjack.razorpay.com',
    // NEXT_PUBLIC_API_URL is only used server-side now — do not expose Oracle IP in CSP
    process.env.UPSTASH_REDIS_REST_URL ? process.env.UPSTASH_REDIS_REST_URL : '',
  ].filter(Boolean),
  'frame-src': ["'self'", 'https://www.google.com', 'https://apis.google.com', 'https://api.razorpay.com'],
  'frame-ancestors': ["'none'"],
  'form-action': [
    "'self'",
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
  ],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
}

function formatCsp(directives) {
  return Object.entries(directives)
    .map(function (_ref) {
      var key = _ref[0],
        values = _ref[1]
      var filtered = values.filter(Boolean)
      if (filtered.length === 0) return ''
      return key + ' ' + filtered.join(' ')
    })
    .filter(Boolean)
    .join('; ')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: formatCsp(CSP_DIRECTIVES),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

