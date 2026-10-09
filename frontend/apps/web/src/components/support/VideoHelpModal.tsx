'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayIcon, XMarkIcon } from '@heroicons/react/24/solid'

export interface VideoHelpModalProps {
  open: boolean
  onClose: () => void
  title: string
  videoSrc: string
  poster?: string
}

export function VideoHelpModal({
  open,
  onClose,
  title,
  videoSrc,
  poster,
}: VideoHelpModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      setIsPlaying(false)
    } else {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
      }
      setIsPlaying(false)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Video guide'}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Ambient Glow */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-[-15%] h-[50vh] w-[90vw] max-w-3xl -translate-x-1/2 rounded-[50%] bg-accent-orange/15 blur-[100px]" />
          </div>

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-surface/95 p-5 shadow-2xl backdrop-blur-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-orange block mb-0.5">
                  Video Guide
                </span>
                <h3 className="text-base font-bold text-white tracking-tight truncate">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close video"
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Container */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/10 shadow-inner">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                src={videoSrc}
                poster={poster}
                controls={isPlaying}
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={handlePause}
                onEnded={() => setIsPlaying(false)}
              />

              {/* Play Overlay */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={handlePlay}
                  aria-label={`Play ${title}`}
                  className="group absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-all focus-visible:outline-none"
                >
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-black/60 text-accent-orange shadow-lg backdrop-blur-md transition-transform duration-200 group-hover:scale-110">
                    <PlayIcon className="w-7 h-7 translate-x-[2px]" />
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default VideoHelpModal
