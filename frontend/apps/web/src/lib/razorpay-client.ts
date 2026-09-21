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
}
