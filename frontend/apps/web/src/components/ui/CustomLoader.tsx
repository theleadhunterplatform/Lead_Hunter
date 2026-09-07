'use client'

import React from 'react'
import { motion } from 'framer-motion'

export type LoaderPageType =
  | 'dashboard'
  | 'leads'
  | 'outreach'
  | 'saved'
  | 'analytics'
  | 'settings'
  | 'admin'
  | 'onboarding'
  | 'default'

interface CustomLoaderProps {
  page?: LoaderPageType
  fullscreen?: boolean
  message?: string
  className?: string
}

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

// ----------------------------------------------------
// 1. LEAD FEED: SOLID WOLF LOGO HUNTER (leads - purple)
// ----------------------------------------------------
const SolidWolfIcon = ({ isSmall }: { isSmall: boolean }) => {
  const size = isSmall ? 32 : 48
  return (
    <div className="relative flex items-center justify-center text-accent-orange" style={{ width: size, height: size }}>
      {/* Expanding backdrop ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-accent-orange/5 border border-accent-orange/10"
        initial={false}
        animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeOut' }}
      />
      {/* Animated Wolf Logo with Mouth Biting/Snap Action */}
      <motion.svg
        viewBox="0 0 1080 1080"
        className="w-full h-full fill-current"
        initial={false}
        animate={{
          scale: [1, 1.12, 1.12, 0.95, 1],
          rotate: [0, -6, -6, 12, 0],
          y: [0, -15, -15, 20, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 2.5,
          ease: 'easeInOut',
          times: [0, 0.25, 0.45, 0.65, 1],
        }}
      >
        {/* Skull and Ears upper structure */}
        <path d="m559.05,895.67c19.63-22.22,37.97-42.97,57.22-64.76-16.36-10.26-21.78-33.45-44.39-32.59-37.06,1.41-79.74-13.81-101.71,35.78,16.54,18.78,35.14,39.92,54.68,62.11-18.04,8.49-34.38,16.3-50.87,23.79-2.3,1.04-6.5,1.74-7.82.48-13.18-12.58-31.45-19.75-36.62-40.6-16.11-64.97-33.4-129.66-50.5-194.38-1.54-5.84-3.9-12.19-7.84-16.53-21.76-23.99-44.14-47.43-67.57-72.42-7.11,6.76-13.81,13.12-21.87,20.78,18.55,21.07,36.86,41.11,54.18,61.97,5.57,6.71,10.15,15.13,12.41,23.52,9.11,33.8,17.13,67.9,26.76,106.79-39.28-23.42-74.49-44.43-109.71-65.42-35.13-20.94-70.27-41.87-107.21-63.87,58.78-50.54,117-100.6,176.07-151.39,2.63,3.98,5.22,6.97,6.81,10.43,15.16,32.98,39.17,53.96,76.14,59.7,5.18.8,12,9.93,12.98,16.02,10.09,62.78,19.12,125.73,28.54,188.62.22,1.5,1.61,2.82,3.07,5.25,19.53-15.66,34.78-29.05,28.36-59.92-11.88-57.17-17.66-115.61-25.64-173.57-1.68-12.23-6.56-20.23-18.59-25.57-28.33-12.56-55.96-26.69-86.35-41.37,28.22-21.82,54.51-42.23,80.9-62.52,29.75-22.87,59.62-45.59,89.36-68.48,6.02-4.63,10.58-8.75,19.06-2.21,55.79,43.04,112.1,85.42,168.19,128.08,1.65,1.26,2.82,3.15,5.25,5.92-30.08,14.63-59.33,28.07-87.65,43.23-6.68,3.58-13.51,12.47-14.71,19.83-10.11,62.23-18.97,124.65-28.12,187.04-3.1,21.11,5.03,33.73,31.76,48.67,4.06-28.98,7.98-57.46,12.05-85.93,4.9-34.3,10.2-68.54,14.71-102.88,1.69-12.89,6.78-21.24,20.63-22.24,1.66-.12,3.25-.98,4.92-1.28,27.31-4.97,47.99-18.05,58.35-45.3,2.91-7.66,8.97-14.11,14.48-22.48,58.99,50.9,116.92,100.88,176.53,152.3-71.98,43.08-142.76,85.44-216.9,129.82,5.56-23.66,10.39-44.26,15.25-64.84,2.87-12.14,4.58-24.73,9.02-36.28,4.56-11.87,10.33-23.87,18.15-33.78,15.45-19.59,32.68-37.77,50.1-57.59-7.26-6.62-14.17-12.92-22.18-20.23-22.12,23.69-45.51,47.63-67.37,72.9-5.88,6.79-7.94,17.4-10.32,26.63-15.78,60.96-29.5,122.52-47.81,182.69-4.81,15.8-23.33,27.49-35.85,40.79-.94,1-4.46.43-6.32-.42-16.84-7.7-33.57-15.62-52.01-24.26Z" />
        <path d="m570.46,340.48c89.44-44.25,149.29-122.65,216.91-192.55-7.55,34.44-15.6,67.45-38.12,95.67-19.06,23.88-34,51.01-51.54,76.16-5.62,8.05-6.1,12.82,1.66,19.82,67.95,61.35,135.36,123.28,203.44,184.49,9.38,8.43,15.21,16.69,17.46,29.52,4.8,27.34,11.92,54.26,17.98,81.38.69,3.11.65,6.39.65,6.34-120.99-98.78-243.18-198.55-368.44-300.82Z" />
        <path d="m299.36,146.37c4.27,6.51,7.75,13.73,12.93,19.4,26.83,29.42,52.66,59.99,81.63,87.17,26.38,24.75,56.28,45.75,84.76,68.25,10.2,8.06,20.76,15.67,32.65,24.62-37.32,29.04-73.46,57.19-109.65,85.29-24.69,19.17-49.78,37.83-73.97,57.6-7.63,6.24-13.8,7.4-22.97,4.25-20.83-7.16-42.09-13.06-66-20.34,51.6-47.57,101.6-93.68,153.25-141.3-19.94-29.56-38.28-59.56-59.49-87.37-19.94-26.15-28.9-56.22-37.55-86.73-.8-2.81,3.12-6.95,4.85-10.48,0,0-.42-.35-.42-.35Z" />
        <path d="m299.36,146.37s.42.34.42.35c-3.29-2.07-6.58-4.14-11.95-7.51-3.88,17.09-7.76,32.71-10.96,48.47-16.26,80.06-32.21,160.17-48.72,240.18-1.4,6.81-4.81,14.24-9.6,19.11-13.06,13.25-27.36,25.28-45.1,41.36,31.43-143.89,61.81-282.95,93.07-426.06,40.85,44.92,79.39,87.3,117.93,129.68-.68.89-1.36,1.77-2.04,2.66-27.68-16.07-55.36-32.15-83.05-48.22Z" />
        <path d="m908.33,483.18c-24.57-21.18-51.89-36.92-58.36-74.58-15.06-87.62-35.29-174.36-53.47-261.45-.44-2.11-1.3-4.13-2.69-8.45-31.48,18.52-62.03,36.5-92.57,54.47-.82-.83-1.63-1.65-2.45-2.48,38.14-41.85,76.28-83.7,116.61-127.95,31.46,142.36,62.2,281.4,92.93,420.44Z" />
        <path d="m142.9,642.18c7.27-33.72,12.61-68.05,22.82-100.86,3.65-11.74,19.47-19.44,28.99-29.67,10.75-11.56,22.29-12.03,36.55-7.07,17.03,5.93,34.82,9.65,56.52,15.46-48.67,42.93-95.05,83.84-141.42,124.75-1.15-.87-2.3-1.74-3.45-2.61Z" />
        <path d="m639,249.33c-34.57,26.11-65.53,49.49-97.12,73.35-32.21-23.86-63.8-47.27-99.01-73.35h196.13Z" />
        {/* Animated Lower Jaw / Chin that snaps down to bite */}
        <motion.path
          d="m541.72,987.53c-15.09-3.86-31.09-6.24-45.4-12.49-5.46-2.38-8.65-13.41-9.7-20.94-.49-3.5,5.83-9.64,10.38-11.83,11.71-5.62,24-10.18,36.39-14.14,4.95-1.58,11.12-1.75,16.11-.34,10.86,3.08,21.67,6.86,31.8,11.8,6.23,3.04,15.94,9,15.72,13.23-.55,11-1.7,24.05-18.12,26.17-12.24,1.58-24.18,5.47-37.17,8.54Z"
          initial={false}
          animate={{
            y: [0, 45, 0, 15, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.5,
            ease: 'easeInOut',
            times: [0, 0.25, 0.45, 0.65, 1],
          }}
        />
      </motion.svg>
    </div>
  )
}

// ----------------------------------------------------
// 2. DASHBOARD: SOLID RADAR SCANNER (dashboard - mint)
// ----------------------------------------------------
const RadarScannerIcon = ({ isSmall }: { isSmall: boolean }) => {
  const size = isSmall ? 32 : 48
  return (
    <div className="relative flex items-center justify-center text-accent-orange" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        <circle cx="12" cy="12" r="10" className="opacity-10" />
        <circle cx="12" cy="12" r="7" className="opacity-20" />
        {/* Solid rotating radar sweep */}
        <motion.path
          d="M12 12 L12 2 A10 10 0 0 1 22 12 Z"
          className="opacity-30"
          initial={false}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          style={{ transformOrigin: '12px 12px' }}
        />
        {/* Center hub */}
        <circle cx="12" cy="12" r="2" />
        {/* Solid active targets */}
        <motion.circle
          cx="17"
          cy="7"
          r="1.2"
          initial={false}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
        />
        <motion.circle
          cx="7"
          cy="15"
          r="1"
          initial={false}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 3, delay: 1.8 }}
        />
      </svg>
    </div>
  )
}

// ----------------------------------------------------
// 3. PIPELINE/SAVED: SOLID PROGRESSION FUNNEL (saved - orange)
// ----------------------------------------------------
const PipelineFlowIcon = ({ isSmall }: { isSmall: boolean }) => {
  const size = isSmall ? 32 : 48
  return (
    <div className="relative flex items-center justify-center text-accent-orange" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        {/* Three solid columns showing a progression pipeline (funnel flow) */}
        <motion.rect
          x="2"
          y="8"
          width="4"
          height="8"
          rx="1.2"
          initial={false}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
        />
        <motion.rect
          x="10"
          y="6"
          width="4"
          height="12"
          rx="1.2"
          initial={false}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
        />
        <motion.rect
          x="18"
          y="4"
          width="4"
          height="16"
          rx="1.2"
          initial={false}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: 1 }}
        />
        {/* Connectors */}
        <rect x="6" y="11" width="4" height="2" className="opacity-30" />
        <rect x="14" y="11" width="4" height="2" className="opacity-30" />
      </svg>
    </div>
  )
}

// ----------------------------------------------------
// 4. OUTREACH: SOLID HUNTING SPEARHEAD (outreach - pink)
// ----------------------------------------------------
const HuntingSpearIcon = ({ isSmall }: { isSmall: boolean }) => {
  const size = isSmall ? 32 : 48
  return (
    <div className="relative flex items-center justify-center text-accent-orange" style={{ width: size, height: size }}>
      <motion.svg
        viewBox="0 0 24 24"
        className="w-full h-full fill-current"
        initial={false}
        animate={{ y: [-1.5, 1.5, -1.5] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
      >
        {/* Solid Arrowhead / Spearhead representing the outreach spear */}
        <path d="M12 2 L20 10 L14 11 L14 20 C14 21 10 21 10 20 L10 11 L4 10 Z" />
      </motion.svg>
    </div>
  )
}

// ----------------------------------------------------
// 5. ANALYTICS: SOLID PAW TRACKS (analytics - cyan)
// ----------------------------------------------------
const TrailTrackingIcon = ({ isSmall }: { isSmall: boolean }) => {
  const size = isSmall ? 32 : 48
  return (
    <div className="relative flex items-center justify-center text-accent-orange" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        {/* Solid animal tracks representing trail telemetry */}
        <motion.g animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2, delay: 0 }} initial={false}>
          {/* Paw 1 */}
          <circle cx="5" cy="17" r="1" />
          <ellipse cx="5" cy="14" r="1.5" rx="1.2" />
        </motion.g>
        <motion.g animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2, delay: 0.6 }} initial={false}>
          {/* Paw 2 */}
          <circle cx="12" cy="11" r="1" />
          <ellipse cx="12" cy="8" r="1.5" rx="1.2" />
        </motion.g>
        <motion.g animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2, delay: 1.2 }} initial={false}>
          {/* Paw 3 */}
          <circle cx="19" cy="7" r="1" />
          <ellipse cx="19" cy="4" r="1.5" rx="1.2" />
        </motion.g>
      </svg>
    </div>
  )
}

// ----------------------------------------------------
// 6. SETTINGS: SOLID TARGET SCOPE (settings - mint)
// ----------------------------------------------------
const TargetScopeIcon = ({ isSmall }: { isSmall: boolean }) => {
  const size = isSmall ? 32 : 48
  return (
    <div className="relative flex items-center justify-center text-accent-orange" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        <circle cx="12" cy="12" r="10" className="opacity-15" />
        {/* Scope outer frame */}
        <path d="M12 2 C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        {/* Crosshair ticks */}
        <rect x="11" y="4" width="2" height="3" />
        <rect x="11" y="17" width="2" height="3" />
        <rect x="4" y="11" width="3" height="2" />
        <rect x="17" y="11" width="3" height="2" />
        <circle cx="12" cy="12" r="1.5" />
      </svg>
    </div>
  )
}

// ----------------------------------------------------
// 7. ADMIN: SOLID CROSSED AXES SHIELD (admin - mint)
// ----------------------------------------------------
const HunterShieldIcon = ({ isSmall }: { isSmall: boolean }) => {
  const size = isSmall ? 32 : 48
  return (
    <div className="relative flex items-center justify-center text-accent-orange" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        {/* Solid shield */}
        <path d="M12 1L3 4v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V4l-9-3z" />
        {/* Crossed axes details */}
        <path d="M7 8l10 8M17 8L7 16" stroke="#121314" strokeWidth="2" strokeLinecap="round" />
        <path d="M6 7l2 2" stroke="currentColor" strokeWidth="2.5" />
        <path d="M18 7l-2 2" stroke="currentColor" strokeWidth="2.5" />
      </svg>
    </div>
  )
}

// ----------------------------------------------------
// 8. ONBOARDING: LICENSE BADGE SCAN (onboarding - orange)
// ----------------------------------------------------
const MembershipBadgeIcon = ({ isSmall }: { isSmall: boolean }) => {
  const size = isSmall ? 32 : 48
  return (
    <div className="relative flex items-center justify-center text-accent-orange" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        {/* Avatar cutout representation */}
        <circle cx="12" cy="9" r="3" fill="#121314" />
        <path d="M6 18c0-3 3-4 6-4s6 1 6 4" fill="#121314" />
        {/* Scan line overlay */}
        <motion.rect
          x="3"
          y="3"
          width="18"
          height="1.5"
          className="fill-current text-white"
          initial={false}
          animate={{ y: [0, 16, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  )
}

// ----------------------------------------------------
// 9. DEFAULT: COMPASS DIAL (default - mint)
// ----------------------------------------------------
const DefaultHunterIcon = ({ isSmall }: { isSmall: boolean }) => {
  const size = isSmall ? 32 : 48
  return (
    <div className="relative flex items-center justify-center text-accent-orange" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
        <circle cx="12" cy="12" r="10" />
        {/* Compass needle cutout */}
        <motion.polygon
          points="12,4 14,12 12,14 10,12"
          fill="#121314"
          initial={false}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
          style={{ transformOrigin: '12px 12px' }}
        />
        <circle cx="12" cy="12" r="1.5" className="fill-current text-accent-orange" />
      </svg>
    </div>
  )
}

// ----------------------------------------------------
// LOADER STATE DICTIONARY
// ----------------------------------------------------
const pageConfigs: Record<
  LoaderPageType,
  {
    icon: React.ComponentType<{ isSmall: boolean }>
    message: string
    colorClass: string
    glowClass: string
  }
> = {
  leads: {
    icon: SolidWolfIcon,
    message: 'Hold up we are gathering some prey to hunt...',
    colorClass: 'text-accent-orange',
    glowClass: 'glow-purple-soft',
  },
  dashboard: {
    icon: RadarScannerIcon,
    message: 'Intercepting buyer-intent signals and calibrating radar...',
    colorClass: 'text-accent-orange',
    glowClass: 'glow-purple-soft',
  },
  saved: {
    icon: PipelineFlowIcon,
    message: 'Counting the trophy bag and organizing your pipeline...',
    colorClass: 'text-accent-orange',
    glowClass: 'glow-purple-soft',
  },
  outreach: {
    icon: HuntingSpearIcon,
    message: 'Sharpening outreach spears and preparing bait...',
    colorClass: 'text-accent-orange',
    glowClass: 'glow-purple-soft',
  },
  analytics: {
    icon: TrailTrackingIcon,
    message: 'Decoding hunt telemetry and mapping conversion velocity...',
    colorClass: 'text-accent-orange',
    glowClass: 'glow-purple-soft',
  },
  settings: {
    icon: TargetScopeIcon,
    message: 'Fine-tuning hunting gear and configuring your environment...',
    colorClass: 'text-accent-orange',
    glowClass: 'glow-purple-soft',
  },
  admin: {
    icon: HunterShieldIcon,
    message: 'Accessing the hunter control deck and verifying clearance...',
    colorClass: 'text-accent-orange',
    glowClass: 'glow-purple-soft',
  },
  onboarding: {
    icon: MembershipBadgeIcon,
    message: 'Verifying your hunter credentials and polishing your badge...',
    colorClass: 'text-accent-orange',
    glowClass: 'glow-purple-soft',
  },
  default: {
    icon: DefaultHunterIcon,
    message: 'Preparing the hunt...',
    colorClass: 'text-accent-orange',
    glowClass: 'glow-purple-soft',
  },
}

export function CustomLoader({
  page = 'default',
  fullscreen = false,
  message,
  className,
}: CustomLoaderProps) {
  const config = pageConfigs[page] || pageConfigs.default
  const IconComponent = config.icon
  const displayMessage = message || config.message

  if (fullscreen) {
    return (
      <div
        className={classNames(
          'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg-main px-6 select-none overflow-hidden',
          className
        )}
      >
        {/* Glow backdrop behind */}
        <div
          className={classNames(
            'absolute w-[400px] h-[400px] -translate-y-12 pointer-events-none opacity-40 blur-[80px]',
            config.glowClass
          )}
          style={{
            background:
              page === 'leads'
                ? 'radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%)'
                : page === 'saved'
                ? 'radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%)'
                : page === 'outreach'
                ? 'radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, transparent 70%)'
                : page === 'analytics'
                ? 'radial-gradient(circle, rgba(184, 243, 107, 0.12) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(184, 243, 107, 0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex flex-col items-center max-w-sm text-center space-y-5">
          {/* Animated custom icon */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md shadow-elevation-3 flex items-center justify-center w-16 h-16">
            <IconComponent isSmall={false} />
          </div>

          <div className="space-y-2">
            <h4
              className={classNames(
                'text-xs font-bold uppercase tracking-super opacity-90',
                config.colorClass
              )}
            >
              {page === 'default' ? 'Loading' : `${page} Operations`}
            </h4>
            <p className="text-sm font-medium text-text-primary/95 leading-relaxed tracking-tight px-4">
              {displayMessage}
            </p>
          </div>

          {/* Sleek bottom scan line loader bar */}
          <div className="w-32 h-[3px] bg-white/[0.06] rounded-full overflow-hidden relative">
            <motion.div
              className={classNames(
                'absolute top-0 bottom-0 left-0 w-1/3 rounded-full',
                page === 'leads'
                  ? 'bg-accent-orange shadow-[0_0_8px_#ffb800]'
                  : page === 'saved'
                  ? 'bg-accent-orange shadow-[0_0_8px_#ffb800]'
                  : page === 'outreach'
                  ? 'bg-accent-orange shadow-[0_0_8px_#ffb800]'
                  : page === 'analytics'
                  ? 'bg-accent-orange shadow-[0_0_8px_#ffb800]'
                  : 'bg-accent-orange shadow-[0_0_8px_#ffb800]'
              )}
              animate={{ left: ['-30%', '100%'] }}
              initial={false}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Inline loader configuration for inside tables/content
  return (
    <div
      className={classNames(
        'w-full flex flex-col items-center justify-center py-16 px-4 text-center select-none relative',
        className
      )}
    >
      <div className="flex flex-col items-center space-y-4 max-w-xs">
        {/* Animated icon */}
        <div className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] shadow-elevation-1 flex items-center justify-center w-12 h-12">
          <IconComponent isSmall={true} />
        </div>

        <p className="text-xs font-medium text-text-secondary/90 leading-relaxed tracking-tight">
          {displayMessage}
        </p>

        {/* Small subtle scanning loader */}
        <div className="w-16 h-[2px] bg-white/[0.04] rounded-full overflow-hidden relative">
          <motion.div
            className={classNames(
              'absolute top-0 bottom-0 left-0 w-1/3 rounded-full',
              page === 'leads'
                ? 'bg-accent-orange/75'
                : page === 'saved'
                ? 'bg-accent-orange/75'
                : page === 'outreach'
                ? 'bg-accent-orange/75'
                : page === 'analytics'
                ? 'bg-accent-orange/75'
                : 'bg-accent-orange/75'
            )}
            animate={{ left: ['-30%', '100%'] }}
            initial={false}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  )
}
