'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import AppSidebar from '@/components/layout/AppSidebar'
import { useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/ui/Toast'
import { CustomLoader, type LoaderPageType } from '@/components/ui/CustomLoader'
import { UpgradeNudgePopup, type UpgradeNudgeVariant } from '@/components/ui'
import { getFirebaseToken } from '@/lib/firebase'



export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, error, firebaseUser } = useAuth()

  const appRoutes = ['/dashboard', '/leads', '/saved', '/analytics', '/settings', '/support', '/referrals']
  const adminRoutes = ['/admin']
  const authRoutes = ['/login', '/register']
  const onboardingRoutes = ['/onboarding', '/verify-email', '/pending-approval', '/admin-register']
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/reviews' ||
    pathname === '/wall-of-love' ||
    authRoutes.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith('/sneak-peek')
  const isOnboardingRoute = onboardingRoutes.some((r) => pathname.startsWith(r))
  const isAdminRoute = adminRoutes.some((r) => pathname.startsWith(r))

  const isAppRoute = appRoutes.some((r) => pathname.startsWith(r))
  const isProtectedRoute = appRoutes.some((r) => pathname.startsWith(r))

  const isEmailVerified = firebaseUser?.emailVerified ?? !!user?.emailVerified

  // Design-only upgrade nudge. No API calls here.
  // Your login/billing code triggers it with:
  //   window.dispatchEvent(new CustomEvent('show-upgrade-nudge', { detail: { variant: 'upgrade' } }))
  // detail supports: variant ('upgrade' | 'renewal' | 'low-credits' | 'out-of-credits'),
  // plan, creditsRemaining, planMax, renewalDate.
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [nudgeVariant, setNudgeVariant] = useState<UpgradeNudgeVariant>('upgrade')
  const [nudgeMeta, setNudgeMeta] = useState<{
    plan?: string
    creditsRemaining?: number
    planMax?: number
    renewalDate?: string
  }>({})

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Record<string, unknown>>).detail ?? {}
      if (typeof detail.variant === 'string') {
        const v = detail.variant as string
        if (v === 'upgrade' || v === 'renewal' || v === 'low-credits' || v === 'out-of-credits') {
          setNudgeVariant(v)
        }
      }
      setNudgeMeta({
        plan: typeof detail.plan === 'string' ? detail.plan : undefined,
        creditsRemaining: typeof detail.creditsRemaining === 'number' ? detail.creditsRemaining : undefined,
        planMax: typeof detail.planMax === 'number' ? detail.planMax : undefined,
        renewalDate: typeof detail.renewalDate === 'string' ? detail.renewalDate : undefined,
      })
      setNudgeOpen(true)
    }
    window.addEventListener('show-upgrade-nudge', handler)
    return () => window.removeEventListener('show-upgrade-nudge', handler)
  }, [])

  // Check for 1-time targeted popup notification whenever user is active in the app
  useEffect(() => {
    if (loading || !user) return

    const isExcludedRoute =
      pathname === '/verify-email' ||
      authRoutes.some((r) => pathname.startsWith(r)) ||
      onboardingRoutes.some((r) => pathname.startsWith(r)) ||
      adminRoutes.some((r) => pathname.startsWith(r))

    if (isExcludedRoute) return

    let isSubscribed = true

    const checkPopupNudge = async () => {
      try {
        let token = (await firebaseUser?.getIdToken()) || (await getFirebaseToken())
        if (!token) {
          // Allow brief Firebase auth token hydration
          await new Promise((r) => setTimeout(r, 800))
          token = (await firebaseUser?.getIdToken()) || (await getFirebaseToken())
        }
        if (!token || !isSubscribed) return

        const res = await fetch('/api/notifications/popup-status', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        console.log('[LeadHunter Popup] Checked nudge status:', data)
        if (data.show && data.variant && isSubscribed) {
          setNudgeVariant(data.variant)
          setNudgeMeta({
            plan: data.plan,
            creditsRemaining: data.creditsRemaining,
            planMax: data.planMax,
            renewalDate: data.renewalDate,
          })
          setNudgeOpen(true)
        }
      } catch (err) {
        console.warn('[Popup] Check failed:', err)
      }
    }

    checkPopupNudge()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkPopupNudge()
      }
    }, 30_000)

    return () => {
      isSubscribed = false
      clearInterval(interval)
    }
  }, [user, loading, firebaseUser, pathname])

  useEffect(() => {
    if (loading || error || !user) return

    // Step 1: email must be verified before anything else
    if (!isEmailVerified) {
      if (pathname !== '/verify-email' && !pathname.startsWith('/login')) {
        router.push('/verify-email')
      }
      return
    }

    // Step 2: status-based routing
    if (isPublicRoute || isOnboardingRoute || isAdminRoute) {
      if (pathname === '/' && user) {
        if (user.status === 'ACTIVE' && user.hasCompletedOnboarding) {
          router.push('/dashboard')
        } else if (user.status === 'ACTIVE' && !user.hasCompletedOnboarding) {
          router.push('/onboarding')
        } else if (user.status === 'PENDING') {
          router.push(user.hasCompletedOnboarding ? '/pending-approval' : '/onboarding')
        } else if (user.status === 'REJECTED' || user.status === 'SUSPENDED') {
          router.push('/pending-approval')
        }
      }
      return
    }

    if (user.status === 'ACTIVE' && !user.hasCompletedOnboarding) {
      router.push('/onboarding')
    } else if (user.status === 'PENDING' && !user.hasCompletedOnboarding) {
      router.push('/onboarding')
    } else if (user.status === 'PENDING' && user.hasCompletedOnboarding) {
      router.push('/pending-approval')
    } else if (user.status === 'REJECTED' || user.status === 'SUSPENDED') {
      router.push('/pending-approval')
    }
  }, [
    user,
    loading,
    error,
    pathname,
    router,
    isPublicRoute,
    isOnboardingRoute,
    isAdminRoute,
    isEmailVerified,
  ])

  useEffect(() => {
    const isLanding = !isAppRoute
    if (!isLanding) return

    let disposed = false
    let lenisInstance: any = null

    import('lenis').then(({ default: Lenis }) => {
      if (disposed) return
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
      })

      function raf(time: number) {
        if (disposed) return
        lenisInstance?.raf(time)
        requestAnimationFrame(raf)
      }

      requestAnimationFrame(raf)
    })

    return () => {
      disposed = true
      if (lenisInstance) {
        lenisInstance.destroy()
      }
    }
  }, [isAppRoute])

  if (loading && isProtectedRoute && !isAdminRoute) {
    let detectedPage: LoaderPageType = 'default'
    if (pathname.startsWith('/dashboard')) detectedPage = 'dashboard'
    else if (pathname.startsWith('/leads')) detectedPage = 'leads'
    else if (pathname.startsWith('/saved')) detectedPage = 'saved'
    else if (pathname.startsWith('/analytics')) detectedPage = 'analytics'
    else if (pathname.startsWith('/settings')) detectedPage = 'settings'
    else if (pathname.startsWith('/admin')) detectedPage = 'admin'
    else if (pathname.startsWith('/support')) detectedPage = 'default'
    else if (pathname.startsWith('/onboarding') || pathname.startsWith('/pending-approval')) detectedPage = 'onboarding'

    return <CustomLoader page={detectedPage} fullscreen />
  }

  return (
    <ToastProvider>
      {(pathname === '/' || pathname === '/reviews' || pathname === '/wall-of-love') && <Navbar />}
      {isAppRoute ? (
        <div className="flex h-screen bg-bg-main overflow-hidden font-sans">
          <AppSidebar />
          {children}
        </div>
      ) : (
        children
      )}
      {/* 1-Time Dashboard Popup Nudge */}
      <UpgradeNudgePopup
        open={nudgeOpen}
        variant={nudgeVariant}
        plan={nudgeMeta.plan}
        creditsRemaining={nudgeMeta.creditsRemaining}
        planMax={nudgeMeta.planMax}
        renewalDate={nudgeMeta.renewalDate}
        onClose={async () => {
          setNudgeOpen(false)
          try {
            const token = await getFirebaseToken()
            if (token && nudgeVariant) {
              await fetch('/api/notifications/popup-status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ variant: nudgeVariant }),
              })
            }
          } catch (e) {
            console.error('[Nudge] Dismiss error:', e)
          }
        }}
        onUpgrade={async () => {
          setNudgeOpen(false)
          try {
            const token = await getFirebaseToken()
            if (token && nudgeVariant) {
              await fetch('/api/notifications/popup-status', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ variant: nudgeVariant }),
              })
            }
          } catch (e) {
            console.error('[Nudge] Dismiss error:', e)
          }

          if (nudgeVariant === 'low-credits' || nudgeVariant === 'out-of-credits') {
            router.push('/refill')
          } else {
            router.push('/pricing')
          }
        }}
      />
    </ToastProvider>
  )
}
