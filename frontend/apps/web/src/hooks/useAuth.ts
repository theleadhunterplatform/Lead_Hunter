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
    document.cookie = '__session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; secure'
    document.cookie = '__session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;'
  }
}

async function clearClientAuthStorage() {
  setSessionCookie(null)

  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (
          key &&
          (key.startsWith('firebase:') || key.includes('auth') || key.includes('session'))
        ) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))
    } catch {
      // ignore storage errors
    }

    try {
      if (window.indexedDB && typeof window.indexedDB.databases === 'function') {
        const dbs = await window.indexedDB.databases()
        for (const db of dbs) {
          if (db.name && (db.name.includes('firebase') || db.name.includes('firestore'))) {
            window.indexedDB.deleteDatabase(db.name)
          }
        }
      } else if (window.indexedDB) {
        window.indexedDB.deleteDatabase('firebaseLocalStorageDb')
      }
    } catch {
      // ignore indexedDB errors
    }
  }
}

let globalCachedUser: User | null = null
let globalCachedTimestamp = 0
let inFlightMePromise: Promise<User | null> | null = null
const authSubscribers = new Set<(user: User | null) => void>()

function updateGlobalCachedUser(user: User | null) {
  globalCachedUser = user
  globalCachedTimestamp = user ? Date.now() : 0
  authSubscribers.forEach((fn) => {
    try {
      fn(user)
    } catch {
      // ignore subscriber errors
    }
  })
}

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(globalCachedUser)
  const [loading, setLoading] = useState(!globalCachedUser)
  const [error, setError] = useState<string | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<import('firebase/auth').User | null>(null)
  const [lastSynced, setLastSynced] = useState<number | null>(globalCachedTimestamp || null)
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number | null>(null)
  const fbUserRef = useRef<import('firebase/auth').User | null>(null)

  useEffect(() => {
    const subscriber = (newUser: User | null) => {
      setUser(newUser)
      if (newUser) {
        setLoading(false)
        setLastSynced(Date.now())
      }
    }
    authSubscribers.add(subscriber)
    return () => {
      authSubscribers.delete(subscriber)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const syncUser = async (fbUser: import('firebase/auth').User) => {
      const now = Date.now()
      fbUserRef.current = fbUser
      setFirebaseUser(fbUser)
      setError(null)
      setLastTokenRefresh(now)

      // 1. If we have a fresh user cache (< 10 seconds old) matching this UID, reuse immediately!
      if (
        globalCachedUser &&
        globalCachedUser.id === fbUser.uid &&
        now - globalCachedTimestamp < 10_000
      ) {
        setUser(globalCachedUser)
        setLoading(false)
        return
      }

      // 2. If an identical fetch is already in flight, reuse that exact promise
      if (inFlightMePromise) {
        try {
          const u = await inFlightMePromise
          if (isMounted && u) {
            setUser(u)
            setLoading(false)
          }
        } catch {
          // Handled by creator of inFlightMePromise
        }
        return
      }

      // 3. Otherwise, create the inFlight promise
      inFlightMePromise = (async () => {
        try {
          const token = await fbUser.getIdToken()
          setSessionCookie(token)
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })

          if (res.ok) {
            const json = await res.json()
            const userData = json.data?.data ?? json.data
            if (userData) {
              updateGlobalCachedUser(userData)
              return userData as User
            }
          }
          throw new Error(`Server returned ${res.status}`)
        } finally {
          inFlightMePromise = null
        }
      })()

      try {
        const userData = await inFlightMePromise
        if (isMounted && userData) {
          setUser(userData)
          setLastSynced(Date.now())
          setLoading(false)

          if (userData.status === 'SUSPENDED' || userData.status === 'REJECTED') {
            setSessionCookie(null)
            router.push('/pending-approval')
          }
        }
      } catch (err) {
        console.error('[useAuth] Failed to sync user from /api/auth/me:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load user data')
          setLoading(false)
        }
      }
    }

    const clearAuthState = () => {
      updateGlobalCachedUser(null)
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

    const handleCreditsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ creditsRemaining?: number }>
      if (typeof customEvent.detail?.creditsRemaining === 'number') {
        const remaining = customEvent.detail.creditsRemaining
        if (globalCachedUser) {
          const prevAccount = globalCachedUser.creditAccount || {
            subscriptionBalance: 0,
            bonusBalance: 0,
            rolloverBalance: 0,
            total: 0,
          }
          const updated: User = {
            ...globalCachedUser,
            creditAccount: {
              ...prevAccount,
              total: remaining,
            },
          }
          updateGlobalCachedUser(updated)
        }
      }
    }
    window.addEventListener('credits-updated', handleCreditsUpdate)

    return () => {
      isMounted = false
      unsubToken()
      unsubAuth()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('credits-updated', handleCreditsUpdate)
      clearInterval(syncInterval)
    }
  }, [router])

  const handleLogout = useCallback(async (redirectPath: string = '/login') => {
    // 1. Immediately wipe React in-memory state synchronously
    updateGlobalCachedUser(null)
    inFlightMePromise = null
    setUser(null)
    setFirebaseUser(null)
    fbUserRef.current = null
    setError(null)
    setLoading(false)

    // 2. Clear cookie synchronously
    setSessionCookie(null)

    // 3. Safely sign out from Firebase
    try {
      await firebaseSignOut(auth)
    } catch (err) {
      console.warn('[useAuth] firebaseSignOut error during logout:', err)
    }

    // 4. Thoroughly clean indexedDB and localStorage auth tokens
    await clearClientAuthStorage()

    // 5. Hard navigate to dump memory and eliminate any stale client-side router state
    if (typeof window !== 'undefined') {
      window.location.href = redirectPath
    } else {
      router.push(redirectPath)
    }
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
