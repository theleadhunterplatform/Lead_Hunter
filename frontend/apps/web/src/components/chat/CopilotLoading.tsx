'use client'

import React from 'react'
import { motion } from 'framer-motion'

const STATUS_LINES = [
  'Scanning knowledge base',
  'Composing reply',
  'Checking platform policies',
]

const ease = [0.16, 1, 0.3, 1] as const

function MiniWolfFace() {
  return (
    <svg viewBox="0 0 1080 1080" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="loadWolfGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="50%" stopColor="#ffb800" />
          <stop offset="100%" stopColor="#c78a00" />
        </linearGradient>
      </defs>
      <g fill="url(#loadWolfGrad)">
        <path d="m559.05,895.67c19.63-22.22,37.97-42.97,57.22-64.76-16.36-10.26-21.78-33.45-44.39-32.59-37.06,1.41-79.74-13.81-101.71,35.78,16.54,18.78,35.14,39.92,54.68,62.11-18.04,8.49-34.38,16.3-50.87,23.79-2.3,1.04-6.5,1.74-7.82.48-13.18-12.58-31.45-19.75-36.62-40.6-16.11-64.97-33.4-129.66-50.5-194.38-1.54-5.84-3.9-12.19-7.84-16.53-21.76-23.99-44.14-47.43-67.57-72.42-7.11,6.76-13.81,13.12-21.87,20.78,18.55,21.07,36.86,41.11,54.18,61.97,5.57,6.71,10.15,15.13,12.41,23.52,9.11,33.8,17.13,67.9,26.76,106.79-39.28-23.42-74.49-44.43-109.71-65.42-35.13-20.94-70.27-41.87-107.21-63.87,58.78-50.54,117-100.6,176.07-151.39,2.63,3.98,5.22,6.97,6.81,10.43,15.16,32.98,39.17,53.96,76.14,59.7,5.18.8,12,9.93,12.98,16.02,10.09,62.78,19.12,125.73,28.54,188.62.22,1.5,1.61,2.82,3.07,5.25,19.53-15.66,34.78-29.05,28.36-59.92-11.88-57.17-17.66-115.61-25.64-173.57-1.68-12.23-6.56-20.23-18.59-25.57-28.33-12.56-55.96-26.69-86.35-41.37,28.22-21.82,54.51-42.23,80.9-62.52,29.75-22.87,59.62-45.59,89.36-68.48,6.02-4.63,10.58-8.75,19.06-2.21,55.79,43.04,112.1,85.42,168.19,128.08,1.65,1.26,2.82,3.15,5.25,5.92-30.08,14.63-59.33,28.07-87.65,43.23-6.68,3.58-13.51,12.47-14.71,19.83-10.11,62.23-18.97,124.65-28.12,187.04-3.1,21.11,5.03,33.73,31.76,48.67,4.06-28.98,7.98-57.46,12.05-85.93,4.9-34.3,10.2-68.54,14.71-102.88,1.69-12.89,6.78-21.24,20.63-22.24,1.66-.12,3.25-.98,4.92-1.28,27.31-4.97,47.99-18.05,58.35-45.3,2.91-7.66,8.97-14.11,14.48-22.48,58.99,50.9,116.92,100.88,176.53,152.3-71.98,43.08-142.76,85.44-216.9,129.82,5.56-23.66,10.39-44.26,15.25-64.84,2.87-12.14,4.58-24.73,9.02-36.28,4.56-11.87,10.33-23.87,18.15-33.78,15.45-19.59,32.68-37.77,50.1-57.59-7.26-6.62-14.17-12.92-22.18-20.23-22.12,23.69-45.51,47.63-67.37,72.9-5.88,6.79-7.94,17.4-10.32,26.63-15.78,60.96-29.5,122.52-47.81,182.69-4.81,15.8-23.33,27.49-35.85,40.79-.94,1-4.46.43-6.32-.42-16.84-7.7-33.57-15.62-52.01-24.26Z" />
        <path d="m570.46,340.48c89.44-44.25,149.29-122.65,216.91-192.55-7.55,34.44-15.6,67.45-38.12,95.67-19.06,23.88-34,51.01-51.54,76.16-5.62,8.05-6.1,12.82,1.66,19.82,67.95,61.35,135.36,123.28,203.44,184.49,9.38,8.43,15.21,16.69,17.46,29.52,4.8,27.34,11.92,54.26,17.98,81.38.69,3.11.65,6.39.65,6.34-120.99-98.78-243.18-198.55-368.44-300.82Z" />
        <path d="m299.36,146.37c4.27,6.51,7.75,13.73,12.93,19.4,26.83,29.42,52.66,59.99,81.63,87.17,26.38,24.75,56.28,45.75,84.76,68.25,10.2,8.06,20.76,15.67,32.65,24.62-37.32,29.04-73.46,57.19-109.65,85.29-24.69,19.17-49.78,37.83-73.97,57.6-7.63,6.24-13.8,7.4-22.97,4.25-20.83-7.16-42.09-13.06-66-20.34,51.6-47.57,101.6-93.68,153.25-141.3-19.94-29.56-38.28-59.56-59.49-87.37-19.94-26.15-28.9-56.22-37.55-86.73-.8-2.81,3.12-6.95,4.85-10.48,0,0-.42-.35-.42-.35Z" />
        <path d="m908.33,483.18c-24.57-21.18-51.89-36.92-58.36-74.58-15.06-87.62-35.29-174.36-53.47-261.45-.44-2.11-1.3-4.13-2.69-8.45-31.48,18.52-62.03,36.5-92.57,54.47-.82-.83-1.63-1.65-2.45-2.48,38.14-41.85,76.28-83.7,116.61-127.95,31.46,142.36,62.2,281.4,92.93,420.44Z" />
        <path d="m142.9,642.18c7.27-33.72,12.61-68.05,22.82-100.86,3.65-11.74,19.47-19.44,28.99-29.67,10.75-11.56,22.29-12.03,36.55-7.07,17.03,5.93,34.82,9.65,56.52,15.46-48.67,42.93-95.05,83.84-141.42,124.75-1.15-.87-2.3-1.74-3.45-2.61Z" />
        <path d="m639,249.33c-34.57,26.11-65.53,49.49-97.12,73.35-32.21-23.86-63.8-47.27-99.01-73.35h196.13Z" />
        <motion.path
          d="m541.72,987.53c-15.09-3.86-31.09-6.24-45.4-12.49-5.46-2.38-8.65-13.41-9.7-20.94-.49-3.5,5.83-9.64,10.38-11.83,11.71-5.62,24-10.18,36.39-14.14,4.95-1.58,11.12-1.75,16.11-.34,10.86,3.08,21.67,6.86,31.8,11.8,6.23,3.04,15.94,9,15.72,13.23-.55,11-1.7,24.05-18.12,26.17-12.24,1.58-24.18,5.47-37.17,8.54Z"
          animate={{ y: [0, 48, 0, 18, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.3, 0.5, 0.7, 1] }}
        />
      </g>
      <motion.circle
        cx="430"
        cy="355"
        r="26"
        fill="#fff8d6"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="655"
        cy="335"
        r="22"
        fill="#fff8d6"
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  )
}

/**
 * Branded chat loading state: wolf signal lock + forming skeleton + rotating status.
 */
export function CopilotLoading() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.35, ease }}
      className="flex items-start gap-2.5 max-w-[88%]"
    >
      {/* Signal lock avatar */}
      <div className="relative mt-0.5 shrink-0">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
        <motion.div
          className="absolute -inset-1 rounded-full border border-primary/40"
          animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
        <div className="relative w-8 h-8 rounded-full bg-surface-container-low border border-primary/35 flex items-center justify-center overflow-hidden shadow-[0_0_16px_rgba(255,184,0,0.2)]">
          <div className="w-6 h-6 p-0.5">
            <MiniWolfFace />
          </div>
          {/* Scan beam */}
          <motion.div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/90 to-transparent"
            animate={{ y: [-10, 14, -10] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>

      {/* Forming content card */}
      <div className="relative overflow-hidden rounded-2xl rounded-tl-md border border-white/[0.08] bg-surface-elevated/70 px-3.5 py-3 min-w-[168px]">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '8px 8px',
          }}
        />
        <div className="relative space-y-2">
          {[88, 72, 54].map((w, i) => (
            <div
              key={w}
              className="h-2 rounded-full bg-white/[0.06] overflow-hidden"
              style={{ width: `${w}%` }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,184,0,0.55) 50%, transparent 100%)',
                }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{
                  duration: 1.25,
                  repeat: Infinity,
                  delay: i * 0.18,
                  ease: 'easeInOut',
                }}
              />
            </div>
          ))}
        </div>

        <div className="relative mt-3 flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
          </span>
          <div className="text-[10px] font-mono tracking-[0.12em] uppercase text-primary/90">
            <StatusCycle />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatusCycle() {
  const [i, setI] = React.useState(0)

  React.useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % STATUS_LINES.length), 1600)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="relative inline-block min-w-[148px]">
      <motion.span
        key={i}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease }}
        className="inline-block"
      >
        {STATUS_LINES[i]}
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="ml-0.5"
        >
          …
        </motion.span>
      </motion.span>
    </span>
  )
}
