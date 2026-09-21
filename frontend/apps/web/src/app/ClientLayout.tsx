'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import AppSidebar from '@/components/layout/AppSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/ui/Toast'
import { CustomLoader, type LoaderPageType } from '@/components/ui/CustomLoader'
import { UpgradeNudgePopup, type UpgradeNudgeVariant, CommunityWinPopup, type CommunityPopupPost } from '@/components/ui'
import { getFirebaseToken } from '@/lib/firebase'



export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, error, firebaseUser } = useAuth()

  const appRoutes = ['/dashboard', '/leads', '/saved', '/analytics', '/settings', '/support', '/referrals', '/rewards', '/community']
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

  // Community Win Notification Popup State
  const [communityPopupOpen, setCommunityPopupOpen] = useState(false)
  const [communityPopupPost, setCommunityPopupPost] = useState<CommunityPopupPost | null>(null)

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

  // Check for 1-time targeted popup notification when user logs in or credits update
  useEffect(() => {
    if (loading || !user) return

    let isSubscribed = true
    let lastCheckedAt = 0

    const checkPopupNudge = async () => {
      const now = Date.now()
      if (now - lastCheckedAt < 30_000) return
      lastCheckedAt = now

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

    const handleCredits = () => {
      lastCheckedAt = 0
      checkPopupNudge()
    }
    window.addEventListener('credits-updated', handleCredits)

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkPopupNudge()
      }
    }, 5 * 60_000) // Poll every 5 minutes instead of 30 seconds

    return () => {
      isSubscribed = false
      window.removeEventListener('credits-updated', handleCredits)
      clearInterval(interval)
    }
  }, [user?.id, loading, firebaseUser])

  // Check for new additions in Community Hub
  useEffect(() => {
    if (loading || !user) return

    let isSubscribed = true
    let lastCommunityCheckAt = 0

    const checkCommunityWinPopup = async () => {
      // Don't show popup if user is already on /community or in /admin
      if (pathname.startsWith('/community') || pathname.startsWith('/admin')) {
        return
      }

      const now = Date.now()
      if (now - lastCommunityCheckAt < 20_000) return
      lastCommunityCheckAt = now

      try {
        let token = (await firebaseUser?.getIdToken()) || (await getFirebaseToken())
        if (!token) {
          await new Promise((r) => setTimeout(r, 600))
          token = (await firebaseUser?.getIdToken()) || (await getFirebaseToken())
        }
        if (!token || !isSubscribed) return

        const res = await fetch('/api/community/unread-popup', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()

        if (data.show && data.post && isSubscribed) {
          // Check local storage as instant fast cache
          const localSeen = typeof window !== 'undefined' ? localStorage.getItem(`community_win_seen_${data.post.id}`) : null
          if (!localSeen) {
            setCommunityPopupPost(data.post)
            setCommunityPopupOpen(true)
          }
        }
      } catch (err) {
        console.warn('[Community Popup] Check failed:', err)
      }
    }

    // Delay initial check slightly after page mount
    const timer = setTimeout(() => {
      checkCommunityWinPopup()
    }, 1200)

    // Listen for custom event when admin publishes a new win
    const handleNewWinEvent = () => {
      lastCommunityCheckAt = 0
      checkCommunityWinPopup()
    }
    window.addEventListener('community-new-post', handleNewWinEvent)

    // Poll periodically every 2 minutes
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkCommunityWinPopup()
      }
    }, 2 * 60_000)

    return () => {
      isSubscribed = false
      clearTimeout(timer)
      clearInterval(interval)
      window.removeEventListener('community-new-post', handleNewWinEvent)
    }
  }, [user?.id, loading, firebaseUser, pathname])

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

    // Skip smooth scroll on touch / small screens — native scroll is faster there
    if (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(max-width: 767px)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

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
          <div className="hidden md:block shrink-0">
            <AppSidebar />
          </div>
          {children}
          <MobileBottomNav />
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

      {/* New Community Win Popup */}
      <CommunityWinPopup
        open={communityPopupOpen}
        post={communityPopupPost}
        onClose={async () => {
          const id = communityPopupPost?.id
          setCommunityPopupOpen(false)
          if (!id) return
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(`community_win_seen_${id}`, 'true')
            }
            const token = (await firebaseUser?.getIdToken()) || (await getFirebaseToken())
            if (token) {
              await fetch('/api/community/unread-popup', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ postId: id }),
              })
            }
          } catch (e) {
            console.error('[Community Popup] Dismiss error:', e)
          }
        }}
        onViewWin={async (postId) => {
          setCommunityPopupOpen(false)
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(`community_win_seen_${postId}`, 'true')
            }
            const token = (await firebaseUser?.getIdToken()) || (await getFirebaseToken())
            if (token) {
              await fetch('/api/community/unread-popup', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ postId }),
              })
            }
          } catch (e) {
            console.error('[Community Popup] Dismiss error:', e)
          }
          router.push('/community')
        }}
      />
    </ToastProvider>
  )
}
