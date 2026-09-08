<<<<<<< HEAD
export type RazorpaySuccessResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export type RazorpayCheckoutOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  order_id: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  theme?: { color?: string }
  handler: (response: RazorpaySuccessResponse) => void
  modal?: { ondismiss?: () => void }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void }
  }
}

let scriptPromise: Promise<void> | null = null

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only load in the browser'))
  }
  if (window.Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    )
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout script')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'))
    document.body.appendChild(script)
  })

  return scriptPromise
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions) {
  await loadRazorpayScript()
  if (!window.Razorpay) {
    throw new Error('Razorpay SDK failed to initialize')
  }
  const rzp = new window.Razorpay(options)
  rzp.open()
=======
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

export interface RazorpayOptions {
  key: string
  subscription_id?: string
  order_id?: string
  amount?: number
  currency?: string
  name?: string
  description?: string
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  handler?: (response: Record<string, string>) => void
  modal?: { ondismiss?: () => void }
}

let scriptPromise: Promise<boolean> | null = null

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (typeof window.Razorpay !== 'undefined') return Promise.resolve(true)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
  return scriptPromise
}

export function openRazorpayCheckout(options: RazorpayOptions): Promise<{
  succeeded: boolean
  canceled: boolean
}> {
  return new Promise((resolve) => {
    loadRazorpayScript().then((loaded) => {
      if (!loaded || typeof window.Razorpay === 'undefined') {
        resolve({ succeeded: false, canceled: true })
        return
      }

      let settled = false
      const rzp = new window.Razorpay({
        ...options,
        handler: (response) => {
          if (!settled) {
            settled = true
            options.handler?.(response)
            resolve({ succeeded: true, canceled: false })
          }
        },
        modal: {
          ondismiss: () => {
            if (!settled) {
              settled = true
              options.modal?.ondismiss?.()
              resolve({ succeeded: false, canceled: true })
            }
          },
        },
      })
      rzp.open()
    })
  })
}

export function isRazorpayCheckoutAvailable(): boolean {
  return typeof window !== 'undefined'
>>>>>>> affea9403aac7d0a77b2b1a92bda16cb021e9426
}
