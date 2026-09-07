'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Bars3Icon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
import { useAuth } from '@/hooks/useAuth'

const navLinks = [
  { name: 'How It Works', href: '#funnel' },
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'FAQ', href: '#faq' },
]

const ease = [0.16, 1, 0.3, 1] as const

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [activeHash, setActiveHash] = useState('')
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Scroll listener to toggle isScrolled once scroll exceeds 50px
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Active hash sync using Intersection Observer
  useEffect(() => {
    const sections = ['funnel', 'features', 'pricing', 'faq']
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -50% 0px',
      threshold: 0,
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveHash(`#${entry.target.id}`)
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)
    
    sections.forEach((id) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    const handleHashChange = () => {
      if (window.location.hash) {
        setActiveHash(window.location.hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()

    return () => {
      observer.disconnect()
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close mobile menu on Escape key
  useEffect(() => {
    if (!mobileOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  const showDashboard = !loading && user
  const showLogin = !isScrolled || isHovered
  const showSneakPeek = !isScrolled || isHovered

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 right-0 z-50 flex justify-center px-4 md:px-6 transition-all duration-500 ease-out ${
          isScrolled ? 'py-3' : 'py-5'
        }`}
      >
        <div
          className={`flex items-center justify-between w-full transition-all duration-500 ease-out ${
            isScrolled
              ? isHovered
                ? 'max-w-[1200px] bg-background/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-2xl px-5 py-3'
                : 'max-w-[760px] bg-background/90 backdrop-blur-2xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-full px-5 py-2.5'
              : 'max-w-[1200px] bg-transparent border border-transparent rounded-2xl px-5 py-3'
          }`}
        >
          {/* Left: Brand */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <Image
              src="/logo.svg"
              alt="Lead Hunter Club"
              width={32}
              height={32}
              className="w-8 h-8 rounded-xl"
            />
            {/* Show brand name on desktop, or if not scrolled on mobile */}
            <span className={`font-display text-[16px] font-semibold tracking-tight text-text-primary group-hover:opacity-80 transition-opacity duration-300 whitespace-nowrap ${
              isScrolled ? 'hidden sm:block' : 'block'
            }`}>
              Lead Hunter Club
            </span>
          </Link>

          {/* Center: Links (Desktop) */}
          <div className="hidden md:flex items-center shrink-0 flex-nowrap">
            <div className="flex items-center gap-1 flex-nowrap">
              {navLinks.map((link) => {
                const isActive = activeHash === link.href
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className={`relative px-4 py-2 text-[13px] font-medium transition-all duration-300 tracking-wide rounded-lg whitespace-nowrap ${
                      isActive
                        ? 'text-accent-orange bg-accent-orange/[0.04]'
                        : 'text-text-secondary/70 hover:text-text-primary hover:bg-white/[0.04]'
                    }`}
                  >
                    {link.name}
                  </a>
                )
              })}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 shrink-0 flex-nowrap">
            {showDashboard ? (
              <>
                {/* Desktop Dashboard Link */}
                <a
                  href="/dashboard"
                  className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-text-primary text-bg-main text-[13px] font-bold overflow-hidden accent-glow-primary hover:accent-glow-primary transition-all duration-500 hover:scale-[1.03] active:scale-95 group shrink-0"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRightIcon className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </a>

                {/* Compact Mobile Dashboard Link */}
                <a
                  href="/dashboard"
                  className="md:hidden flex items-center justify-center px-4 py-2 rounded-full bg-text-primary text-bg-main text-[12px] font-bold transition-all duration-300 active:scale-95 shadow-[0_4px_12px_rgba(var(--rgb-white),0.1)] shrink-0"
                >
                  Dashboard
                </a>
              </>
            ) : (
              <>
                {/* Desktop Guest Actions */}
                <div className="hidden md:flex items-center gap-3 shrink-0 flex-nowrap">
                  <AnimatePresence>
                    {showLogin && (
                      <motion.a
                        initial={isScrolled ? { opacity: 0, width: 0, scale: 0.95 } : false}
                        animate={{ opacity: 1, width: 'auto', scale: 1 }}
                        exit={{ opacity: 0, width: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease }}
                        href="/login"
                        className="text-[13px] font-medium text-text-secondary/70 hover:text-text-primary transition-colors duration-300 tracking-wide px-4 py-2 overflow-hidden whitespace-nowrap"
                      >
                        Log in
                      </motion.a>
                    )}
                  </AnimatePresence>
                  
                  <AnimatePresence>
                    {showSneakPeek && (
                      <motion.a
                        initial={isScrolled ? { opacity: 0, width: 0, scale: 0.95 } : false}
                        animate={{ opacity: 1, width: 'auto', scale: 1 }}
                        exit={{ opacity: 0, width: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease }}
                        href="/sneak-peek"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-accent-orange/20 hover:bg-accent-orange/[0.03] text-text-secondary hover:text-text-primary text-[13px] font-medium transition-all duration-300 overflow-hidden whitespace-nowrap"
                      >
                        <span>Sneak Peek</span>
                      </motion.a>
                    )}
                  </AnimatePresence>

                  <a
                    href="/register"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-text-primary text-bg-main text-[13px] font-bold overflow-hidden accent-glow-primary hover:accent-glow-primary transition-all duration-500 hover:scale-[1.03] active:scale-95 group"
                  >
                    <span>Start Hunting</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </a>
                </div>

                {/* Compact Mobile "Start Hunting" Link */}
                <a
                  href="/register"
                  className="md:hidden flex items-center justify-center px-4 py-2 rounded-full bg-text-primary text-bg-main text-[12px] font-bold transition-all duration-300 active:scale-95 shadow-[0_4px_12px_rgba(var(--rgb-white),0.1)]"
                >
                  Start Hunting
                </a>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-all duration-300"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? <XMarkIcon className="w-4 h-4" /> : <Bars3Icon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-background/95 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className="relative z-10 mt-24 mx-4 p-6 rounded-2xl bg-surface border border-white/[0.06] shadow-[0_20px_60px_rgba(var(--rgb-black),0.5)]"
            >
              <div className="space-y-1 mb-6">
                {navLinks.map((link, i) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease }}
                    className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-medium text-text-secondary/80 hover:text-text-primary hover:bg-white/[0.04] transition-all duration-300"
                  >
                    <span>{link.name}</span>
                    <ArrowRightIcon className="w-[14px] h-[14px] text-text-secondary/30" />
                  </motion.a>
                ))}
              </div>

              <div className="border-t border-white/[0.06] pt-5 space-y-3">
                {showDashboard ? (
                  <a
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-text-primary text-bg-main text-[14px] font-bold shadow-[0_0_20px_rgba(var(--rgb-white),0.1)] transition-all duration-500"
                  >
                    Go to Dashboard
                    <ArrowRightIcon className="w-[15px] h-[15px]" />
                  </a>
                ) : (
                  <>
                    <a
                      href="/sneak-peek"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[14px] font-medium text-text-secondary hover:text-text-primary border border-white/[0.06] hover:border-accent-orange/20 hover:bg-accent-orange/[0.03] transition-all duration-300"
                    >
                      Sneak Peek
                    </a>
                    <a
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block text-center px-5 py-3 rounded-xl text-[14px] font-medium text-text-secondary/70 hover:text-text-primary border border-white/[0.06] hover:bg-white/[0.04] transition-all duration-300"
                    >
                      Log in
                    </a>
                    <a
                      href="/register"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-text-primary text-bg-main text-[14px] font-bold shadow-[0_0_20px_rgba(var(--rgb-white),0.1)] transition-all duration-500"
                    >
                      Start Hunting
                      <ArrowRightIcon className="w-[15px] h-[15px]" />
                    </a>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
