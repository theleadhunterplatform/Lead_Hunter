'use client'

import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XMarkIcon, ArrowUpTrayIcon, PhotoIcon, CheckCircleIcon,
  ExclamationTriangleIcon, DocumentTextIcon, UserIcon, TagIcon,
  PencilSquareIcon, EnvelopeIcon, PhoneIcon,
} from '@heroicons/react/24/solid'
import { getFirebaseToken } from '@/lib/firebase'
import { useToast } from '@/components/ui/Toast'

interface ManualLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface UploadResult {
  success: boolean
  filename: string
  message?: string
  extractedText?: string
}

const PLATFORMS = [
  { id: 'manual', label: 'General/Manual' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'threads', label: 'Threads' },
]

type Mode = 'image' | 'text'

export default function ManualLeadModal({ isOpen, onClose, onSuccess }: ManualLeadModalProps) {
  const [mode, setMode] = useState<Mode>('image')

  // Image upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [results, setResults] = useState<UploadResult[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Shared fields
  const [keyword, setKeyword] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [platform, setPlatform] = useState('manual')
  const [error, setError] = useState<string | null>(null)

  // Text/manual entry fields
  const [content, setContent] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactCompany, setContactCompany] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [textSuccess, setTextSuccess] = useState(false)

  const { addToast } = useToast()

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) addFiles(files)
  }

  const addFiles = (files: File[]) => {
    setError(null)
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024)
    if (validFiles.length < files.length) {
      setError('Some files were skipped because they exceed the 5MB limit.')
    }
    setSelectedFiles(prev => [...prev, ...validFiles])
    setPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))])
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleImageUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image')
      return
    }
    setIsUploading(true)
    setError(null)
    setResults(null)

    const formData = new FormData()
    selectedFiles.forEach(f => formData.append('images', f))
    formData.append('keyword', keyword || 'Manual Bulk Upload')
    formData.append('platform', platform)
    if (authorName) formData.append('authorName', authorName)

    try {
      const token = await getFirebaseToken()
      if (!token) throw new Error('Not authenticated')
      const res = await fetch('/api/admin/leads/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Upload failed')

      setResults(data.results || [])
      if (data.count > 0) {
        addToast({ type: 'success', message: `✓ ${data.count} lead(s) queued for processing` })
        setTimeout(() => { onSuccess(); resetForm() }, 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process images. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleTextSubmit = async () => {
    if (!content.trim()) {
      setError('Post content is required')
      return
    }
    if (!keyword.trim()) {
      setError('Keyword is required')
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      const token = await getFirebaseToken()
      if (!token) throw new Error('Not authenticated')

      const res = await fetch('/api/admin/manual-lead', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          keyword: keyword.trim(),
          authorName: contactName.trim() || authorName.trim() || 'Manual Entry',
          platform,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactCompany: contactCompany.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to add lead')

      setTextSuccess(true)
      addToast({ type: 'success', message: '✓ Lead added successfully' })
      setTimeout(() => { onSuccess(); resetForm() }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to add lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    previews.forEach(u => URL.revokeObjectURL(u))
    setSelectedFiles([])
    setPreviews([])
    setKeyword('')
    setAuthorName('')
    setPlatform('manual')
    setError(null)
    setResults(null)
    setContent('')
    setContactEmail('')
    setContactPhone('')
    setContactName('')
    setContactCompany('')
    setTextSuccess(false)
    setMode('image')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl overflow-hidden bg-surface border border-white/10 rounded-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-mint/10 flex items-center justify-center rounded-xl border border-accent-mint/30">
                  <DocumentTextIcon className="text-accent-mint w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary tracking-tight">Add Lead Manually</h2>
                  <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest">Image OCR or Text Entry</p>
                </div>
              </div>
              <button onClick={resetForm} className="text-text-secondary hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Mode switcher */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setMode('image')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  mode === 'image' ? 'text-accent-mint border-b-2 border-accent-mint bg-accent-mint/5' : 'text-text-secondary hover:text-white'
                }`}
              >
                <PhotoIcon className="w-3 h-3" /> Image Upload (OCR)
              </button>
              <button
                onClick={() => setMode('text')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  mode === 'text' ? 'text-accent-mint border-b-2 border-accent-mint bg-accent-mint/5' : 'text-text-secondary hover:text-white'
                }`}
              >
                <PencilSquareIcon className="w-3 h-3" /> Text Entry + Contact
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3 rounded-xl">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* IMAGE MODE */}
              {mode === 'image' && (
                <>
                  {results ? (
                    <div className="py-12 flex flex-col items-center text-center space-y-6">
                      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/30">
                        <CheckCircleIcon className="text-green-400 w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-text-primary tracking-tight mb-2">Batch Queued!</h3>
                        <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest max-w-[280px] mx-auto">
                          We&apos;ve received your {selectedFiles.length} images. They are being processed in the background.
                        </p>
                      </div>
                      <button onClick={resetForm} className="px-12 py-2.5 bg-accent-mint text-black rounded-xl font-bold text-sm hover:brightness-110 transition-all">
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div
                        className="border border-white/10 border-dashed bg-white/[0.03] rounded-xl p-8 text-center cursor-pointer hover:border-accent-mint/50 transition-all group"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                        onDrop={(e: DragEvent) => { e.preventDefault(); e.stopPropagation(); addFiles(Array.from(e.dataTransfer.files)) }}
                      >
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                        {previews.length > 0 ? (
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                            {previews.map((preview, index) => (
                              <div key={index} className="relative aspect-square group/preview">
                                <img src={preview} alt="preview" className="w-full h-full object-cover rounded-xl border border-white/10" />
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeFile(index) }}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/preview:opacity-100 transition-opacity"
                                >
                                  <XMarkIcon className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <div className="aspect-square flex flex-col items-center justify-center rounded-xl border border-white/10 border-dashed hover:border-accent-mint transition-colors">
                              <ArrowUpTrayIcon className="w-5 h-5 text-text-secondary/60 mb-2" />
                              <span className="text-[8px] font-bold uppercase text-text-secondary">Add More</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                              <ArrowUpTrayIcon className="w-7 h-7 text-text-secondary/60 group-hover:text-accent-mint" />
                            </div>
                            <p className="text-sm font-bold uppercase tracking-widest text-text-primary mb-1">Upload Bulk Screenshots</p>
                            <p className="text-[10px] text-text-secondary uppercase font-bold">Click or Drag Multiple Images (Max 5MB each)</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                            <TagIcon className="w-3 h-3" /> Batch Keyword (Optional)
                          </label>
                          <input placeholder="e.g. SEO Leads" value={keyword} onChange={e => setKeyword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                            <UserIcon className="w-3 h-3" /> Author Prefix (Optional)
                          </label>
                          <input placeholder="e.g. Unknown Author" value={authorName} onChange={e => setAuthorName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                          <PhotoIcon className="w-3 h-3" /> Source Platform
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {PLATFORMS.map(p => (
                            <button key={p.id} type="button" onClick={() => setPlatform(p.id)}
                              className={`px-4 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
                                platform === p.id ? 'bg-accent-mint text-black border-accent-mint' : 'bg-white/5 text-text-secondary border-white/10 hover:border-white/30'
                              }`}>{p.label}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TEXT MODE */}
              {mode === 'text' && (
                <>
                  {textSuccess ? (
                    <div className="py-12 flex flex-col items-center text-center space-y-6">
                      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/30">
                        <CheckCircleIcon className="text-green-400 w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-text-primary tracking-tight mb-2">Lead Added!</h3>
                        <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-widest">
                          Lead has been added and queued for qualification.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Post content */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                          <PencilSquareIcon className="w-3 h-3" /> Post Content <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          rows={5}
                          placeholder="Paste the lead post content here..."
                          value={content}
                          onChange={e => setContent(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm resize-none"
                        />
                      </div>

                      {/* Keyword + Platform */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                            <TagIcon className="w-3 h-3" /> Keyword <span className="text-red-400">*</span>
                          </label>
                          <input placeholder="e.g. Web Development" value={keyword} onChange={e => setKeyword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Platform</label>
                          <select value={platform} onChange={e => setPlatform(e.target.value)}
                            className="w-full bg-surface-elevated border border-white/10 text-white rounded-xl outline-none focus:ring-1 focus:ring-accent-mint/50 transition-all px-3.5 py-2.5 text-sm [&>option]:bg-surface-elevated [&>option]:text-white">
                            {PLATFORMS.map(p => <option key={p.id} value={p.id} className="bg-zinc-900 text-white">{p.label}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-mint">Contact Details (Optional — skip enrichment)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
                              <EnvelopeIcon className="w-3 h-3" /> Email
                            </label>
                            <input type="email" placeholder="john@company.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                              className="w-full bg-surface-elevated border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-accent-mint/50" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
                              <PhoneIcon className="w-3 h-3" /> Phone
                            </label>
                            <input type="tel" placeholder="+1 555 123 4567" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                              className="w-full bg-surface-elevated border border-white/10 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-accent-mint/50" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-black/40 border-t border-white/10 flex gap-4">
              <button onClick={resetForm} disabled={isUploading || isSubmitting}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-text-secondary rounded-xl font-bold text-sm hover:bg-white/10 transition-all disabled:opacity-50">
                Cancel
              </button>
              {mode === 'image' ? (
                <button
                  onClick={handleImageUpload}
                  disabled={isUploading || selectedFiles.length === 0 || results !== null}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent-mint text-black rounded-xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isUploading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <DocumentTextIcon className="w-4 h-4" />}
                  {isUploading ? 'Processing...' : `Process ${selectedFiles.length} ${selectedFiles.length === 1 ? 'Lead' : 'Leads'}`}
                </button>
              ) : (
                <button
                  onClick={handleTextSubmit}
                  disabled={isSubmitting || !content.trim() || textSuccess}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-accent-mint text-black rounded-xl font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <PencilSquareIcon className="w-4 h-4" />}
                  {isSubmitting ? 'Adding Lead...' : 'Add Lead'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
