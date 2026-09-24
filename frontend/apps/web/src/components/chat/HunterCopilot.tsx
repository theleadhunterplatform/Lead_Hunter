'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Minus,
  Send,
  RotateCcw,
  ExternalLink,
  ChevronUp,
  Command,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { auth } from '@/lib/firebase'
import { WolfOrb } from '@/components/chat/WolfOrb'
import { CopilotLoading } from '@/components/chat/CopilotLoading'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const WELCOME_ID = 'welcome-1'

const QUICK_QUESTIONS = [
  { label: 'How do Credits work?', tag: '01' },
  { label: 'Are revealed leads exclusive?', tag: '02' },
  { label: 'How do plan renewals work?', tag: '03' },
  { label: 'How to contact human support?', tag: '04' },
]

const CAPABILITIES = [
  { title: 'Credits & reveal costs', hint: 'Standard vs custom overrides' },
  { title: 'Lead exclusivity', hint: '1-to-1 claim rules' },
  { title: 'Plans & renewals', hint: 'Upgrades, refills, refunds' },
  { title: 'Human support', hint: 'Open a priority ticket' },
]

const INITIAL_WELCOME: Message = {
  id: WELCOME_ID,
  role: 'assistant',
  content: `👋 Hey there! I'm **Hunter Copilot**, your 24/7 platform support assistant.

I can answer questions about:
• **Credits & Reveal Costs** (standard vs. custom overrides)
• **1-to-1 Lead Exclusivity** & Claim rules
• **Plan Renewals, Upgrades & Refills**
• **Refund Policy** on invalid contacts
• **Opening Support Tickets** with our admin team

Tap a quick question below or ask anything!`,
  timestamp: 'Just now',
}

const ease = [0.16, 1, 0.3, 1] as const

function ControlButton({
  onClick,
  title,
  children,
  danger,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid h-7 w-7 place-items-center rounded-lg border border-transparent transition-all duration-200 active:scale-90 ${
        danger
          ? 'text-text-secondary hover:text-white hover:bg-white/[0.06] hover:border-white/10'
          : 'text-text-secondary hover:text-primary hover:bg-primary/10 hover:border-primary/25'
      }`}
    >
      {children}
    </button>
  )
}

function WelcomeBrief() {
  return (
    <div className="relative overflow-hidden rounded-2xl rounded-tl-md border border-white/[0.09] bg-surface-elevated/55">
      {/* top hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/50 via-primary/10 to-transparent" />
      <div
        className="absolute -top-16 -right-10 h-36 w-36 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.55) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          maskImage: 'radial-gradient(ellipse at 20% 0%, black 10%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 20% 0%, black 10%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
            Briefing
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-primary/35 to-transparent" />
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-muted">
            24/7
          </span>
        </div>

        <p className="text-[13px] leading-relaxed text-text-primary mb-1">
          Hey — I&apos;m <span className="font-semibold text-white">Hunter Copilot</span>, your
          platform support assistant.
        </p>
        <p className="text-[11px] leading-relaxed text-text-secondary mb-3.5">
          Ask anything below, or jump straight into a common question.
        </p>

        <ul className="grid grid-cols-1 gap-1.5">
          {CAPABILITIES.map((c, i) => (
            <motion.li
              key={c.title}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.35, ease }}
              className="group flex items-start gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2"
            >
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-[2px] bg-primary/80 shadow-[0_0_8px_rgba(255,184,0,0.45)]" />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-text-primary leading-snug">
                  {c.title}
                </span>
                <span className="block text-[10px] text-text-muted leading-snug">{c.hint}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <div className="relative max-w-[88%] rounded-2xl rounded-tl-md border border-white/[0.08] bg-surface-elevated/70 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span
        className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-gradient-to-b from-primary/70 via-primary/25 to-transparent"
        aria-hidden
      />
      <div className="markdown-content text-[12px] text-text-secondary leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-1 [&>ul]:mt-1 [&>ul]:pl-4 [&>ul]:list-disc [&>ul>li]:mb-0.5 [&>strong]:text-white [&>a]:text-primary [&>a]:underline hover:[&>a]:text-white">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="relative max-w-[86%] overflow-hidden rounded-2xl rounded-tr-md border border-primary/40 bg-gradient-to-br from-primary to-[#e0a400] px-3.5 py-2.5 shadow-[0_8px_24px_-8px_rgba(255,184,0,0.45)]">
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent opacity-40 pointer-events-none"
        aria-hidden
      />
      <p className="relative whitespace-pre-wrap text-[12px] font-semibold leading-relaxed text-on-primary">
        {content}
      </p>
    </div>
  )
}

export function HunterCopilot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INITIAL_WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, isMinimized, messages, scrollToBottom])

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: 'Just now',
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const token = await auth.currentUser?.getIdToken()

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: query,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()

      const botReply: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content:
          data.reply ||
          data.error ||
          "I'm having trouble connecting right now. For urgent help, please visit the [/support](/support) page!",
        timestamp: 'Just now',
      }

      setMessages((prev) => [...prev, botReply])
    } catch (err) {
      console.error('[Hunter Copilot] Query error:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content:
            "Connection error. Please try again or open a ticket directly at [/support](/support).",
          timestamp: 'Just now',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleResetChat = () => {
    setMessages([INITIAL_WELCOME])
  }

  const orbState = loading ? 'thinking' : isOpen ? 'online' : 'idle'
  const showPrompts = messages.length <= 2 && !loading

  return (
    <>
      {/* Floating Trigger */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.4, ease }}
          className="fixed bottom-6 right-6 z-50 safe-area-bottom"
        >
          <button
            onClick={() => {
              setIsOpen(true)
              setIsMinimized(false)
            }}
            title="Open Hunter Copilot 24/7 Support"
            aria-label="Open Hunter Copilot"
            className="group relative grid h-[56px] w-[56px] place-items-center rounded-full border border-white/10 bg-surface-container/95 shadow-elevation-4 backdrop-blur-md transition-all duration-300 hover:border-primary/45 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.85),0_0_28px_-6px_rgba(255,184,0,0.3)] active:scale-95"
          >
            <span
              className="pointer-events-none absolute inset-0 rounded-full bg-primary/15 opacity-0 blur-lg transition-opacity group-hover:opacity-100"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
              aria-hidden
            />
            <WolfOrb size="sm" state="idle" showRing={false} showStatus={false} />
            {/* Live status pip */}
            <span
              className="pointer-events-none absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-surface-container bg-secondary shadow-[0_0_8px_rgba(67,237,158,0.7)]"
              aria-hidden
            />
          </button>
        </motion.div>
      )}

      {/* Minimized */}
      {isOpen && isMinimized && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease }}
          className="fixed bottom-6 right-6 z-50 safe-area-bottom"
        >
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-surface-container/95 py-2 pl-2 pr-2 shadow-elevation-4 backdrop-blur-md">
            <WolfOrb
              size="xs"
              state={loading ? 'thinking' : 'online'}
              showRing={false}
              showStatus={false}
            />
            <span className="pr-1 text-xs font-bold text-white">Hunter Copilot</span>
            <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-secondary" />
            <div className="ml-1 flex items-center gap-0.5 border-l border-white/10 pl-1.5">
              <ControlButton onClick={() => setIsMinimized(false)} title="Expand Copilot">
                <ChevronUp size={14} />
              </ControlButton>
              <ControlButton onClick={() => setIsOpen(false)} title="Close Copilot" danger>
                <X size={14} />
              </ControlButton>
            </div>
          </div>
        </motion.div>
      )}

      {/* Full Chat Window */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.32, ease }}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-6 right-6 z-50 flex h-[560px] max-h-[85vh] w-[360px] flex-col overflow-hidden rounded-[22px] border border-white/[0.1] bg-surface-container-low/98 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl safe-area-bottom sm:w-[410px]"
          >
            {/* Ambient + hairline */}
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-56 rounded-full bg-primary/12 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 128 128\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
              }}
              aria-hidden
            />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/[0.08] bg-gradient-to-b from-surface-container-high/70 to-surface-elevated/30 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <WolfOrb size="sm" state={orbState} showRing={false} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[13px] font-bold tracking-[-0.01em] text-white">
                      Hunter Copilot
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.14em] ${
                        loading
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-secondary/35 bg-secondary/12 text-secondary'
                      }`}
                    >
                      <span
                        className={`h-1 w-1 rounded-full ${loading ? 'bg-primary' : 'bg-secondary'}`}
                      />
                      {loading ? 'Think' : 'Live'}
                    </span>
                  </div>
                  <p className="truncate text-[10px] font-medium text-text-secondary">
                    {loading ? 'Intercepting your question…' : 'Instant FAQ & platform support'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-white/[0.06] bg-black/25 p-0.5">
                <ControlButton onClick={handleResetChat} title="Reset conversation">
                  <RotateCcw size={13} />
                </ControlButton>
                <ControlButton onClick={() => setIsMinimized(true)} title="Minimize">
                  <Minus size={14} />
                </ControlButton>
                <ControlButton onClick={() => setIsOpen(false)} title="Close" danger>
                  <X size={14} />
                </ControlButton>
              </div>
            </div>

            {/* Messages */}
            <div className="relative flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
              {messages.map((msg, idx) => {
                if (msg.role === 'assistant' && msg.id === WELCOME_ID) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease }}
                    >
                      <WelcomeBrief />
                    </motion.div>
                  )
                }

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease, delay: Math.min(idx * 0.02, 0.12) }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/30 bg-surface-container-low">
                          <div className="h-5 w-5">
                            <WolfOrb size="xs" state="online" showRing={false} showStatus={false} trackPointer={false} />
                          </div>
                        </div>
                        <AssistantBubble content={msg.content} />
                      </div>
                    ) : (
                      <UserBubble content={msg.content} />
                    )}
                  </motion.div>
                )
              })}

              <AnimatePresence mode="wait">
                {loading && (
                  <div className="flex justify-start">
                    <CopilotLoading />
                  </div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts */}
            <AnimatePresence>
              {showPrompts && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease }}
                  className="border-t border-white/[0.06] bg-surface-container-high/30 px-3.5 pb-1 pt-2.5"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                      Jump in
                    </span>
                    <span className="h-px flex-1 bg-white/[0.06]" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pb-1">
                    {QUICK_QUESTIONS.map((q, i) => (
                      <motion.button
                        key={q.tag}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + i * 0.05, duration: 0.3, ease }}
                        onClick={() => handleSend(q.label)}
                        disabled={loading}
                        className="group flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2 py-2 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.08] active:scale-[0.98] disabled:opacity-50"
                      >
                        <span className="font-mono text-[9px] font-bold text-primary/70 group-hover:text-primary">
                          {q.tag}
                        </span>
                        <span className="line-clamp-2 text-[10px] font-medium leading-tight text-text-secondary group-hover:text-white">
                          {q.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Composer */}
            <div className="relative border-t border-white/[0.08] bg-surface-container-high/45 px-3 pb-3 pt-2.5">
              <div className="flex items-center gap-2 rounded-2xl border border-white/[0.1] bg-surface-container-lowest/85 px-3 py-2 transition-all focus-within:border-primary/55 focus-within:shadow-[0_0_0_3px_rgba(255,184,0,0.12)]">
                <Command size={12} className="shrink-0 text-text-muted" aria-hidden />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about credits, leads, plans…"
                  disabled={loading}
                  className="min-w-0 flex-1 bg-transparent py-0.5 text-[12px] text-white outline-none placeholder:text-text-muted"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  title="Send message"
                  aria-label="Send message"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-on-primary shadow-[0_4px_14px_-4px_rgba(255,184,0,0.7)] transition-opacity disabled:opacity-25"
                >
                  <Send size={12} className="-translate-x-px" strokeWidth={2.5} />
                </motion.button>
              </div>

              <div className="mt-1.5 flex items-center justify-between px-1">
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted">
                  <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-px text-[8px]">
                    Enter
                  </kbd>
                  to send
                </span>
                <a
                  href="/support"
                  className="group inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-text-secondary transition-colors hover:text-primary"
                >
                  Human support
                  <ExternalLink
                    size={9}
                    className="transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
                  />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
