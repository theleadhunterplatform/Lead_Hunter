'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  X,
  Minus,
  Send,
  Sparkles,
  RotateCcw,
  ExternalLink,
  ChevronUp,
  HelpCircle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { auth } from '@/lib/firebase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const QUICK_QUESTIONS = [
  '⚡ How do Credits work?',
  '🔒 Are revealed leads exclusive?',
  '🔄 How do plan renewals work?',
  '🎫 How to contact human support?',
]

const INITIAL_WELCOME: Message = {
  id: 'welcome-1',
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

  return (
    <>
      {/* Floating Trigger Pill */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <button
            onClick={() => {
              setIsOpen(true)
              setIsMinimized(false)
            }}
            title="Open Hunter Copilot 24/7 Support"
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-[#0f1117]/95 hover:bg-[#161922] text-white border border-accent-mint/30 hover:border-accent-mint/60 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-200 active:scale-95 ring-1 ring-accent-mint/20 hover:ring-accent-mint/40"
          >
            {/* Glow Aura */}
            <div className="absolute inset-0 rounded-full bg-accent-mint/15 blur-md -z-10 group-hover:bg-accent-mint/25 transition-all" />

            <div className="relative w-7 h-7 rounded-full bg-accent-mint/20 border border-accent-mint/40 flex items-center justify-center text-accent-mint group-hover:scale-105 transition-transform">
              <Bot size={16} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                Hunter Copilot
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent-mint/15 text-accent-mint border border-accent-mint/30 font-bold uppercase tracking-wider">
                  24/7
                </span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">Instant Support & FAQs</span>
            </div>
          </button>
        </motion.div>
      )}

      {/* Minimized Pill Bar */}
      {isOpen && isMinimized && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0f1117]/95 text-white border border-accent-mint/30 rounded-xl shadow-2xl backdrop-blur-md">
            <Bot size={16} className="text-accent-mint" />
            <span className="text-xs font-bold">Hunter Copilot</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
            <div className="flex items-center gap-1 ml-3 border-l border-white/10 pl-2">
              <button
                onClick={() => setIsMinimized(false)}
                title="Expand Copilot"
                className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-colors"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Copilot"
                className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-colors"
              >
                <X size={14} />
              </button>
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
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 w-[360px] sm:w-[410px] h-[540px] max-h-[85vh] bg-[#0c0e14]/98 border border-white/10 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.75)] backdrop-blur-2xl flex flex-col overflow-hidden ring-1 ring-white/5"
          >
            {/* Ambient Background Accent Glow */}
            <div className="absolute top-0 right-0 w-48 h-28 bg-accent-mint/10 blur-3xl pointer-events-none rounded-full" />

            {/* Header */}
            <div className="p-3.5 border-b border-white/[0.08] bg-surface-elevated/40 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent-mint/15 border border-accent-mint/30 flex items-center justify-center text-accent-mint shadow-sm shadow-accent-mint/10">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black tracking-tight text-white uppercase">
                      Hunter Copilot
                    </h3>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    24/7 Instant FAQ & Platform Support
                  </p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1 text-zinc-400">
                <button
                  onClick={handleResetChat}
                  title="Reset conversation"
                  className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  title="Minimize"
                  className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  className="p-1.5 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[86%] rounded-2xl p-3 leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-accent-mint text-black font-semibold rounded-tr-none shadow-md shadow-accent-mint/10'
                        : 'bg-surface-elevated/90 text-zinc-200 border border-white/[0.08] rounded-tl-none prose prose-invert prose-sm'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="markdown-content text-xs text-zinc-200 leading-relaxed [&>p]:mb-2 [&>ul]:mb-2 [&>ul]:pl-4 [&>ul]:list-disc [&>strong]:text-white [&>a]:text-accent-mint [&>a]:underline hover:[&>a]:text-white">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-elevated/80 border border-white/[0.06] text-zinc-400 w-fit">
                  <div className="w-4 h-4 rounded-full border-2 border-accent-mint border-t-transparent animate-spin" />
                  <span className="text-[11px] font-medium text-zinc-300">
                    Hunter Copilot is typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips (Shown after welcome or when idle) */}
            {messages.length <= 2 && (
              <div className="px-3.5 pb-2 pt-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                  <HelpCircle size={11} className="text-accent-mint" />
                  <span>Popular Questions</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      disabled={loading}
                      className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-surface-elevated hover:bg-white/10 text-zinc-300 hover:text-white border border-white/[0.08] hover:border-accent-mint/40 transition-all text-left disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-white/[0.08] bg-surface-elevated/30">
              <div className="flex items-center gap-2 bg-[#12141c] border border-white/[0.1] rounded-xl px-3 py-1.5 focus-within:border-accent-mint/50 focus-within:ring-1 focus-within:ring-accent-mint/30 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about Lead Hunter..."
                  disabled={loading}
                  className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-zinc-500 py-1"
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  title="Send message"
                  className="p-1.5 rounded-lg bg-accent-mint text-black hover:bg-accent-mint/90 disabled:opacity-30 disabled:hover:bg-accent-mint transition-all"
                >
                  <Send size={13} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-1.5 px-1 text-[9px] text-zinc-500 font-medium">
                <span>Need priority human assistance?</span>
                <a
                  href="/support"
                  className="text-accent-mint hover:underline inline-flex items-center gap-0.5"
                >
                  Open Ticket <ExternalLink size={8} />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
