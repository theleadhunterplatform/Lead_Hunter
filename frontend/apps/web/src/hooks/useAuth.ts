'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  auth,
  onAuthStateChanged,
  onIdTokenChanged,
  firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getFirebaseToken,
} from '@/lib/firebase'
import type { User } from '@/lib/types'

function setSessionCookie(token: string | null) {
  if (token) {
    document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax; secure`
  } else {
    document.cookie = '__session=; path=/; max-age=0; SameSite=Lax; secure'
  }
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<import('firebase/auth').User | null>(null)
  const [lastSynced, setLastSynced] = useState<number | null>(null)
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number | null>(null)
  const fbUserRef = useRef<import('firebase/auth').User | null>(null)

  useEffect(() => {
    let isMounted = true
    let lastSyncCall = 0

    const syncUser = async (fbUser: import('firebase/auth').User) => {
      const now = Date.now()
      if (now - lastSyncCall < 2000) return
      lastSyncCall = now

      fbUserRef.current = fbUser
      setFirebaseUser(fbUser)
      setError(null)
      setLastTokenRefresh(now)

      try {
        const token = await fbUser.getIdToken()
        setSessionCookie(token)
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const json = await res.json()
          const userData = json.data?.data ?? json.data
          if (isMounted && userData) {
            setUser(userData)
            setLastSynced(Date.now())
            setLoading(false)

            if (userData.status === 'SUSPENDED' || userData.status === 'REJECTED') {
              setSessionCookie(null)
              router.push('/pending-approval')
            }
            return
          }

          if (res.ok && isMounted) {
            console.error('[useAuth] Unexpected response shape:', json)
          }
        }

        throw new Error(`Server returned ${res.status}`)
      } catch (err) {
        console.error('[useAuth] Failed to sync user from /api/auth/me:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load user data')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const clearAuthState = () => {
      setFirebaseUser(null)
      setUser(null)
      setLoading(false)
      setError(null)
      setSessionCookie(null)
    }

    const unsubToken = onIdTokenChanged(auth, (fbUser) => {
      if (!isMounted) return

      if (!fbUser) {
        clearAuthState()
        return
      }

      syncUser(fbUser)
    })

    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (!isMounted) return
      if (!fbUser) {
        clearAuthState()
      }
    })

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && fbUserRef.current && isMounted) {
        syncUser(fbUserRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const syncInterval = setInterval(() => {
      if (fbUserRef.current && isMounted) {
        syncUser(fbUserRef.current)
      }
    }, 5 * 60 * 1000)

    return () => {
      isMounted = false
      unsubToken()
      unsubAuth()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(syncInterval)
    }
  }, [router])

  const handleLogout = useCallback(async () => {
    setSessionCookie(null)
    await firebaseSignOut(auth)
    router.push('/login')
  }, [router])

  const login = useCallback(async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  }, [])

  return {
    user,
    loading,
    error,
    lastSynced,
    lastTokenRefresh,
    isAuthenticated: !!firebaseUser,
    login,
    register,
    logout: handleLogout,
    firebaseUser,
    getToken: getFirebaseToken,
  }
}

export type AuthContextValue = ReturnType<typeof useAuth>
