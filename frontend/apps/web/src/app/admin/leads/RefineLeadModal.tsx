'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, TagIcon, UserIcon, PhotoIcon,
} from '@heroicons/react/24/solid'
import { getFirebaseToken } from '@/lib/firebase'
import type { ExternalPost } from '@/lib/external-api/client'
import { useToast } from '@/components/ui/Toast'

interface RefineLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  lead: ExternalPost | null
}

export default function RefineLeadModal({ isOpen, onClose, onSuccess, lead }: RefineLeadModalProps) {
  const [content, setContent] = useState('')
  const [keyword, setKeyword] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()

  useEffect(() => {
    if (lead) {
      setContent(lead.content === 'Manual Extraction Required' ? '' : lead.content)
      setKeyword(lead.keyword || '')
      setAuthorName(lead.author?.name || '')
    }
  }, [lead])

  const handleSave = async () => {
    if (!lead) return
    if (!content.trim()) {
      setError('Please enter the extracted lead content')
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      const token = await getFirebaseToken()
      if (!token) throw new Error('Not authenticated')
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          keyword: keyword.trim(),
          author: { ...lead.author, name: authorName.trim() },
          status: 'pending',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to update lead')
      addToast({ type: 'success', message: '✓ Lead refined' })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update lead. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFullImageUrl = (url: string | null) => {
    if (!url) return ''
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, '')
    const cleanUrl = url.startsWith('/') ? url : `/${url}`
    return `${baseUrl}${cleanUrl}`
  }

  if (!isOpen || !lead) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-5xl overflow-hidden bg-surface border border-white/10 rounded-2xl flex flex-col md:flex-row h-[90vh]"
        >
          <div className="flex-1 bg-black/40 flex flex-col border-r border-white/10 relative">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhotoIcon className="w-4 h-4 text-accent-mint" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Source Evidence</span>
              </div>
              <a
                href={lead.image_url ? getFullImageUrl(lead.image_url) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[8px] font-bold uppercase tracking-widest text-accent-mint hover:underline"
              >
                Open Full Res
              </a>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {lead.image_url ? (
                <img src={getFullImageUrl(lead.image_url)} alt="Source" className="max-w-full h-auto rounded-xl border border-white/10 shadow-2xl" />
              ) : (
                <div className="text-text-secondary text-xs uppercase font-bold">No Image Attached</div>
              )}
            </div>
          </div>

          <div className="w-full md:w-[400px] flex flex-col bg-surface">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-text-primary tracking-tight">Refine Lead</h2>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Manual Data Entry</p>
              </div>
              <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase flex items-center gap-3 rounded-xl">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                    <CheckCircleIcon className="w-3 h-3" /> Extracted Content
                  </label>
                  <textarea
                    className="w-full h-48 bg-white/[0.04] border border-white/10 rounded-xl p-4 text-xs text-text-primary focus:border-accent-mint transition-colors outline-none resize-none leading-relaxed"
                    placeholder="Type the lead description from the image..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                    <UserIcon className="w-3 h-3" /> Author Name
                  </label>
                  <input
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                    <TagIcon className="w-3 h-3" /> Target Keyword
                  </label>
                  <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-black/20 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="w-full py-3.5 flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest bg-accent-mint text-black rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>Save & Validate</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
