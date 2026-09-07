'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'info'

interface ToastOptions {
  type: ToastType
  message: string
  duration?: number
}

interface Toast extends ToastOptions {
  id: string
}

interface ToastContextValue {
  addToast: (opts: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const typeStyles: Record<ToastType, string> = {
  success: 'border-accent-orange/30 bg-accent-orange/10 text-accent-orange',
  error: 'border-red-500/30 bg-red-500/10 text-red-400',
  info: 'border-accent-orange/30 bg-accent-orange/10 text-accent-orange',
}

const typeIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: '●',
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((opts: ToastOptions) => {
    const id = `toast-${++toastCounter}`
    const duration = opts.duration ?? 3000
    setToasts((prev) => [...prev, { ...opts, id }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border
                backdrop-blur-md shadow-elevation-3 cursor-pointer
                text-sm font-medium ${typeStyles[toast.type]}`}
              onClick={() => removeToast(toast.id)}
            >
              <span className="text-base">{typeIcons[toast.type]}</span>
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
