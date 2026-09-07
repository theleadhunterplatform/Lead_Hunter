'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import AppSidebar from '@/components/layout/AppSidebar'
import { useAuth } from '@/hooks/useAuth'
import { ToastProvider } from '@/components/ui/Toast'
import { CustomLoader, type LoaderPageType } from '@/components/ui/CustomLoader'



export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, error, firebaseUser } = useAuth()

  const appRoutes = ['/dashboard', '/leads', '/saved', '/analytics', '/settings']
  const adminRoutes = ['/admin']
  const authRoutes = ['/login', '/register']
  const onboardingRoutes = ['/onboarding', '/verify-email', '/pending-approval', '/admin-register']
  const isPublicRoute =
    pathname === '/' ||
    authRoutes.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith('/sneak-peek')
  const isOnboardingRoute = onboardingRoutes.some((r) => pathname.startsWith(r))
  const isAdminRoute = adminRoutes.some((r) => pathname.startsWith(r))

  const isAppRoute = appRoutes.some((r) => pathname.startsWith(r))
  const isProtectedRoute = appRoutes.some((r) => pathname.startsWith(r))

  const isEmailVerified = firebaseUser?.emailVerified ?? !!user?.emailVerified

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

    let lenisInstance: any = null

    import('lenis').then(({ default: Lenis }) => {
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
      })

      function raf(time: number) {
        lenisInstance?.raf(time)
        requestAnimationFrame(raf)
      }

      requestAnimationFrame(raf)
    })

    return () => {
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
    else if (pathname.startsWith('/onboarding') || pathname.startsWith('/pending-approval')) detectedPage = 'onboarding'

    return <CustomLoader page={detectedPage} fullscreen />
  }

  return (
    <ToastProvider>
      {pathname === '/' && <Navbar />}
      {isAppRoute ? (
        <div className="flex h-screen bg-bg-main overflow-hidden font-sans">
          <AppSidebar />
          {children}
        </div>
      ) : (
        children
      )}
    </ToastProvider>
  )
}
