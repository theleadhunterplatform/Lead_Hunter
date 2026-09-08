'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  CpuChipIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/solid'
import {
  Mail,
  ShieldCheck,
  Send,
  Paperclip,
  Link2,
  Smile,
  Trash2,
  ChevronDown,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Share2,
  Star,
  Reply,
  Forward,
  Video,
  Phone,
  MoreVertical,
  Mic,
  CheckCheck,
} from 'lucide-react'

// ==========================================
// OFFICIAL BRAND SVG LOGOS (MINIMAL & ACCURATE)
// ==========================================

export function WhatsAppOfficialLogo({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="WhatsApp">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12C2 13.89 2.525 15.66 3.441 17.18L2.067 21.734C1.983 22.012 2.247 22.268 2.523 22.174L7.021 20.655C8.508 21.517 10.207 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM17.482 15.358C17.253 15.996 16.347 16.529 15.659 16.678C15.187 16.779 14.577 16.858 12.502 16.002C9.849 14.908 8.143 12.221 8.01 12.046C7.88 11.871 6.94 10.622 6.94 9.327C6.94 8.033 7.604 7.404 7.842 7.14C8.044 6.915 8.351 6.811 8.665 6.811C8.766 6.811 8.857 6.816 8.938 6.821C9.176 6.831 9.295 6.845 9.451 7.218C9.646 7.686 10.12 8.847 10.178 8.966C10.237 9.085 10.295 9.245 10.216 9.403C10.141 9.564 10.073 9.638 9.954 9.776C9.835 9.914 9.726 10.024 9.607 10.171C9.498 10.299 9.373 10.437 9.507 10.666C9.641 10.895 10.103 11.647 10.785 12.253C11.664 13.034 12.38 13.284 12.637 13.391C12.828 13.471 13.054 13.454 13.192 13.307C13.368 13.119 13.585 12.805 13.808 12.492C13.966 12.268 14.167 12.239 14.375 12.318C14.587 12.392 15.719 12.951 15.952 13.067C16.185 13.183 16.34 13.241 16.398 13.342C16.456 13.443 16.456 13.921 16.227 14.558H17.482Z"
        fill="#25D366"
      />
    </svg>
  )
}

export function LinkedinOfficialLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="LinkedIn">
      <rect width="24" height="24" rx="4.5" fill="#0A66C2" />
      <path
        d="M7.12 9.5H4.88V19H7.12V9.5ZM6 5.5C5.28 5.5 4.7 6.08 4.7 6.8C4.7 7.52 5.28 8.1 6 8.1C6.72 8.1 7.3 7.52 7.3 6.8C7.3 6.08 6.72 5.5 6 5.5ZM19.12 19V13.88C19.12 11.37 17.78 10.2 15.98 10.2C14.53 10.2 13.88 11 13.52 11.56V9.5H11.28V19H13.52V14.12C13.52 12.83 13.77 11.58 15.37 11.58C16.94 11.58 16.96 13.05 16.96 14.2V19H19.12Z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

export function OpenAIOfficialLogo({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#10A37F" aria-label="OpenAI">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  )
}

export function AnthropicOfficialLogo({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#D97757" aria-label="Claude">
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  )
}

export function GeminiOfficialLogo({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#8AB4F8" aria-label="Gemini">
      <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
    </svg>
  )
}

export function ShopifyOfficialLogo({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Shopify">
      <path
        d="M17.8 4.2c-.1 0-.3 0-.4.1L15.3 2.1c-.2-.2-.5-.1-.6.1l-1.3 2.7-3.8 1.2c-.3.1-.4.4-.3.6l.3.9L4.4 9.1c-.2.1-.3.3-.2.5l2.7 12.2c.1.3.3.4.6.4h11.2c.3 0 .5-.2.6-.5l2.6-14.7c0-.2-.1-.4-.3-.5l-3.8-2.3Zm-4.2.7 1.3-2.6 1.4 1.8-2.7.8Zm-2.3 2.2 2.6-.8-.8 1.6-1.8-.8Z"
        fill="#95BF47"
      />
    </svg>
  )
}

// ==========================================
// OUTREACH MODEL CONTENT DATA
// ==========================================

export type AiModelId = 'claude' | 'chatgpt' | 'gemini'

export interface OutreachAngle {
  title: string
  subject: string
  userPrompt: string
  body: string
  clientReply: string
}

export interface ModelConfig {
  id: AiModelId
  name: string
  version: string
  badgeLabel: string
  activeBorder: string
  activeBg: string
  logo: React.ComponentType<{ className?: string }>
  angles: OutreachAngle[]
}

const AI_MODELS: Record<AiModelId, ModelConfig> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    version: '3.5 Sonnet',
    badgeLabel: 'Anthropic',
    activeBorder: 'border-[#D97757]/40',
    activeBg: 'bg-[#D97757]/15 text-[#D97757]',
    logo: AnthropicOfficialLogo,
    angles: [
      {
        title: '3D Performance Angle',
        subject: 'Shopify Plus 3D visualizer (zero mobile lag)',
        userPrompt: 'Draft an executive cold outreach to Marcus Vance addressing mobile Safari Draco 3D compression on Shopify Plus.',
        body: 'Marcus, saw your jewelry brand post. We embed lightweight Draco GLTF 3D models into Shopify Plus without mobile Safari lag. Want a 90s demo?',
        clientReply: 'Draco compression was actually my main concern with 3D on mobile. Free for a quick 10-min call tomorrow?',
      },
      {
        title: 'Launch Speed Angle',
        subject: 'Quick note on Vesper 3D load speed',
        userPrompt: 'Write a sprint proposal to Marcus Vance for launching his Shopify Plus 3D visualizer under 1.4s.',
        body: 'Marcus, we have immediate bandwidth to build your 3D jewelry visualizer on Shopify Plus and keep mobile load times under 1.4s. Open to a teardown?',
        clientReply: 'Yes please. If the mobile load speed holds up, we can start next week.',
      },
    ],
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    version: 'GPT-4o',
    badgeLabel: 'OpenAI',
    activeBorder: 'border-[#10A37F]/40',
    activeBg: 'bg-[#10A37F]/15 text-[#10A37F]',
    logo: OpenAIOfficialLogo,
    angles: [
      {
        title: 'Peer Founder Angle',
        subject: 'Solving mobile Safari 3D lag on Shopify Plus',
        userPrompt: 'Write a direct outreach to Marcus Vance showing our tested Shopify Plus 3D WebGL viewer.',
        body: 'Hey Marcus, saw your Shopify 3D post. Built an interactive 3D WebGL viewer on Plus that runs smooth on iOS Safari. Want to see the video demo?',
        clientReply: 'Would love to see that demo. Most agencies had no answer for mobile Safari lag.',
      },
      {
        title: 'Native Liquid Angle',
        subject: 'Native three.js on Shopify Plus vs heavy plugins',
        userPrompt: 'Pitch native Liquid embedding over bloated app store plugins for luxury jewelry 3D.',
        body: 'Marcus, rather than heavy app plugins, embedding native three.js canvas into Liquid sections keeps the jewelry store fast. Happy to share our checklist.',
        clientReply: 'Good catch on the app store plugins. Let us jump on a call this Thursday.',
      },
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    version: '1.5 Pro',
    badgeLabel: 'Google',
    activeBorder: 'border-[#8AB4F8]/40',
    activeBg: 'bg-[#8AB4F8]/15 text-[#8AB4F8]',
    logo: GeminiOfficialLogo,
    angles: [
      {
        title: 'Conversion Angle',
        subject: 'Vesper Jewelry: 90+ Core Web Vitals with 3D GLTF',
        userPrompt: 'Generate a metrics-focused pitch for custom Shopify Plus GLTF models maintaining Core Web Vitals.',
        body: 'Marcus, custom GLTF models embedded into Shopify Plus preserve 90+ Core Web Vitals while giving luxury jewelry the 3D feel it needs. Open to a 1-min video?',
        clientReply: 'Send the breakdown over to marcus@vesperstudio.co. Looks like you know your stuff.',
      },
      {
        title: 'Sprint Delivery Angle',
        subject: '3-week sprint: Shopify Plus 3D visualizer',
        userPrompt: 'Propose a 3-week sprint to deliver the luxury jewelry visualizer on Shopify Plus.',
        body: 'Marcus, we can take on the complete Shopify Plus build and 3D product visualizer in a focused 3-week sprint. Mind if I send our portfolio?',
        clientReply: 'Portfolio looks great. Are you available for a kickoff call this Friday?',
      },
    ],
  },
}

export function LeadOutreachFlowchart() {
  const [activeModel, setActiveModel] = useState<AiModelId>('claude')
  const [activeAngleIdx, setActiveAngleIdx] = useState<number>(0)
  const [conversionChannel, setConversionChannel] = useState<'email' | 'whatsapp'>('email')
  const [copied, setCopied] = useState<boolean>(false)
  const reduceMotion = useReducedMotion()

  const currentModel = AI_MODELS[activeModel]
  const currentAngle = currentModel.angles[activeAngleIdx]

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="w-full relative rounded-3xl bg-surface-container-lowest border border-white/[0.08] p-4 sm:p-6 md:p-8 overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
      {/* Precision Dot-Grid Canvas Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* ======================================================== */}
      {/* DESKTOP PIPELINE FLOWCHART CANVAS                        */}
      {/* Increased height (840px) for generous breathing room     */}
      {/* ======================================================== */}
      <div className="relative w-full max-w-[940px] mx-auto h-[840px] hidden md:block select-none">
        {/* SVG Connector Beams */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Beam 1: Social Post -> RAG AI Engine */}
          <path
            d="M 370 85 C 310 85, 210 95, 210 145"
            stroke="#ffb800"
            strokeWidth="1.75"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeOpacity="0.85"
            fill="none"
          />
          <circle cx="370" cy="85" r="3" fill="#ffb800" />
          <path
            d="M 206 137 L 210 145 L 214 137"
            stroke="#ffb800"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Beam 2: RAG AI Engine -> Unlocked Lead Card (Clean 170px gap) */}
          <path
            d="M 395 230 L 565 230"
            stroke="#ffb800"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          <circle cx="395" cy="230" r="3" fill="#ffb800" />
          <circle cx="565" cy="230" r="3" fill="#ffb800" />

          {/* Beam 3: Unlocked Lead Card -> Your AI Outreach Engine (145px open vertical corridor) */}
          <path
            d="M 732 335 C 732 405, 235 405, 235 480"
            stroke="#ffb800"
            strokeWidth="1.75"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeOpacity="0.85"
            fill="none"
          />
          <circle cx="732" cy="335" r="3" fill="#ffb800" />
          <path
            d="M 231 472 L 235 480 L 239 472"
            stroke="#ffb800"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Beam 4: Your AI Outreach Engine -> Email Popup & Result (110px gap) */}
          <path
            d="M 455 595 L 565 595"
            stroke="#ffb800"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          <circle cx="455" cy="595" r="3" fill="#ffb800" />
          <circle cx="565" cy="595" r="3" fill="#ffb800" />
        </svg>

        {/* NOTATION PILL 1: On Beam 1 (Clean open air) */}
        <div className="absolute left-[245px] top-[102px] z-20 pointer-events-none">
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest/95 border border-primary/30 text-[9px] font-mono text-primary font-medium tracking-wide shadow-md whitespace-nowrap">
            1. Intercepted in real-time ↓
          </span>
        </div>

        {/* NOTATION PILL 2: Centered between 02 & 03 (Clean 170px gap) */}
        <div className="absolute left-[425px] top-[217px] z-20 pointer-events-none">
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest/95 border border-primary/30 text-[9px] font-mono text-primary font-medium tracking-wide shadow-md whitespace-nowrap">
            2. Packaged for feed →
          </span>
        </div>

        {/* NOTATION PILL 3: In the wide 145px horizontal corridor */}
        <div className="absolute left-[410px] top-[392px] z-20 pointer-events-none">
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest/95 border border-primary/30 text-[9px] font-mono text-primary font-medium tracking-wide shadow-md whitespace-nowrap">
            3. Feed intel into your AI ↓
          </span>
        </div>

        {/* NOTATION PILL 4: Centered between 04 & 05 */}
        <div className="absolute left-[510px] -translate-x-1/2 top-[575px] z-20 pointer-events-none">
          <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest/95 border border-secondary/30 text-[8.5px] font-mono text-secondary font-medium tracking-wide shadow-md whitespace-nowrap">
            Sent →
          </span>
        </div>

        {/* ======================================================== */}
        {/* STAGE 01: Top Node (Real Buyer Signal on LinkedIn)       */}
        {/* ======================================================== */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[10px] z-10 w-[420px]">
          <div className="p-3 px-4 rounded-2xl bg-surface border border-white/[0.1] shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-primary tracking-wider">
                  01 // RAW BUYER SIGNAL
                </span>
                <span className="text-white/20">·</span>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-text-primary">
                  <LinkedinOfficialLogo className="w-3.5 h-3.5 shrink-0" />
                  <span>Marcus Vance</span>
                </div>
              </div>
              <span className="text-[9.5px] font-mono text-text-secondary/50">2h ago</span>
            </div>
            <p className="text-[11.5px] text-text-secondary leading-snug font-sans">
              &quot;Starting a brand for luxury jewelry. Need a web designer who can build custom 3D visuals on Shopify Plus.&quot;
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STAGE 02: Lead Hunter RAG AI Engine (Lead Intelligence)  */}
        {/* ======================================================== */}
        <div className="absolute left-[25px] top-[125px] z-10 w-[370px]">
          {/* Stage Annotation Header */}
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-1.5">
              <CpuChipIcon className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                02 // RAG INTEL ENGINE
              </span>
            </div>
            <span className="text-[8.5px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-semibold">
              Score: 9.4/10
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-container border border-white/[0.1] shadow-xl hover:border-primary/40 transition-colors">

            {/* Dossier Structured Sections */}
            <div className="p-2.5 rounded-xl bg-surface-container-lowest/90 border border-white/[0.04] space-y-1.5 mb-2.5">
              {/* One-Liner */}
              <div>
                <div className="flex items-center gap-1 text-[8.5px] font-mono font-bold text-primary mb-0.5">
                  <span>🧠</span>
                  <span className="uppercase tracking-wider">One-Liner</span>
                </div>
                <p className="text-text-primary text-[10.5px] leading-snug">
                  High-intent founder seeking custom 3D WebGL for Shopify Plus. Dealbreaker: mobile Safari checkout speed.
                </p>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* Context You Might Miss */}
              <div>
                <div className="flex items-center gap-1 text-[8.5px] font-mono font-bold text-[#E5C07B] mb-0.5">
                  <span>🧩</span>
                  <span className="uppercase tracking-wider">Context You Might Miss</span>
                </div>
                <p className="text-text-secondary text-[10px] leading-snug">
                  Direct project brief bypassing agencies: owner seeking direct specialist relationship for flagship luxury launch.
                </p>
              </div>

              <div className="h-px bg-white/[0.04]" />

              {/* The Real X-Factor */}
              <div>
                <div className="flex items-center gap-1 text-[8.5px] font-mono font-bold text-[#FF6B6B] mb-0.5">
                  <span>🔥</span>
                  <span className="uppercase tracking-wider">The Real X-Factor</span>
                </div>
                <p className="text-text-secondary text-[10px] leading-snug">
                  Stock 3D apps tank mobile checkout. Pitching Draco GLTF compression with sub-50ms load wins this contract.
                </p>
              </div>
            </div>

            {/* Footer / Stack Badges */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[9.5px]">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-text-secondary text-[9px]">
                  <ShopifyOfficialLogo className="w-2.5 h-2.5" />
                  <span>Shopify Plus</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-text-secondary text-[9px]">
                  3D / WebGL
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-text-secondary text-[9px]">
                  Draco GLTF
                </span>
              </div>
              <span className="font-mono text-[#B8F36B] font-semibold text-[9px]">
                Intent: High
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STAGE 03: Compact Authentic Unlocked LeadCard from Feed   */}
        {/* ======================================================== */}
        <div className="absolute left-[565px] top-[125px] z-10 w-[335px]">
          {/* Stage Annotation Header */}
          <div className="flex items-center gap-1 mb-1.5 px-1">
            <CheckBadgeIcon className="w-3.5 h-3.5 text-[#B8F36B]" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#B8F36B] font-bold">
              03 // DELIVERED TO YOUR FEED
            </span>
          </div>

          {/* Authentic Lead Hunter Club Lead Card */}
          <div className="relative p-3.5 rounded-[18px] bg-[#B8F36B] text-[#11150C] shadow-[0_12px_36px_rgba(184,243,107,0.18)] transition-all duration-300">
            {/* Top Category Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#11150C]" />
                <span className="text-[9px] font-extrabold tracking-[0.15em] uppercase text-[#11150C]/75">
                  SHOPIFY PLUS · DTC JEWELRY
                </span>
              </div>
              <span className="text-[9px] font-medium text-[#11150C]/60">2h ago</span>
            </div>

            {/* Headline */}
            <h4 className="text-[10.5px] font-extrabold tracking-wide uppercase mb-1 text-[#11150C]">
              LUXURY JEWELRY 3D VISUALIZER
            </h4>

            {/* Quote */}
            <p className="text-[11.5px] font-bold tracking-tight leading-[1.3] text-[#11150C] mb-2.5">
              &quot;Starting a brand for luxury jewelry. Need a web designer who can build custom 3D visuals on Shopify Plus.&quot;
            </p>

            {/* Tags Row */}
            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
              {['Shopify Plus', '3D / WebGL', 'Draco GLTF'].map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#11150C]/10 border border-[#11150C]/10 text-[#11150C]"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Unlocked Contact Footer */}
            <div className="pt-2 border-t border-[#11150C]/15 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#11150C] text-[#B8F36B] flex items-center justify-center font-bold text-[9px] uppercase shrink-0">
                  MV
                </div>
                <div className="min-w-0">
                  <div className="text-[10.5px] font-extrabold text-[#11150C] leading-tight truncate">
                    Marcus Vance (Founder)
                  </div>
                  <div className="text-[9px] text-[#11150C]/75 font-medium flex items-center gap-1 truncate">
                    <Mail size={10} className="shrink-0" />
                    <span className="truncate">marcus@vesperjewelry.co</span>
                  </div>
                </div>
              </div>

              <div className="px-2 py-0.5 rounded-md bg-[#11150C] text-white text-[9px] font-extrabold tracking-wider uppercase shrink-0 shadow-sm">
                ✓ Claimed
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STAGE 04: Realistic AI Tool Outreach Engine              */}
        {/* (Clean, Real Claude, ChatGPT, and Gemini UI)             */}
        {/* ======================================================== */}
        <div className="absolute left-[25px] top-[480px] z-10 w-[430px]">
          {/* Top Stage & Model Selector Tabs */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
              04 // YOUR AI ENGINE
            </span>

            {/* Realistic AI Model Switcher Tabs */}
            <div className="flex items-center gap-1 bg-surface-container-lowest p-0.5 rounded-lg border border-white/[0.08]">
              {(['claude', 'chatgpt', 'gemini'] as AiModelId[]).map((id) => {
                const model = AI_MODELS[id]
                const Icon = model.logo
                const isSelected = activeModel === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveModel(id)
                      setActiveAngleIdx(0)
                    }}
                    className={`flex items-center gap-1.5 py-1 px-2 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                      isSelected
                        ? `${model.activeBg} border ${model.activeBorder} font-semibold shadow-sm`
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{model.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* REALISTIC AI TOOL CONTAINER */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300">
            {/* 1. CLAUDE INTERFACE */}
            {activeModel === 'claude' && (
              <div className="bg-[#1f1e1d] border border-[#3b3a37] rounded-2xl p-3.5 text-text-primary font-sans">
                {/* Claude Top Bar */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <AnthropicOfficialLogo className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold text-[#f0eee6]">Claude 3.5 Sonnet</span>
                    <ChevronDown size={11} className="text-zinc-500" />
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 text-[9.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>200k context</span>
                  </div>
                </div>

                {/* Claude User Prompt Bubble */}
                <div className="bg-[#292825] border border-white/[0.05] rounded-xl p-2.5 text-[10.5px] text-zinc-300 mb-2.5 font-sans">
                  <p className="leading-snug">{currentAngle.userPrompt}</p>
                </div>

                {/* Claude Assistant Response Block */}
                <div className="bg-[#242320] border border-[#D97757]/20 rounded-xl p-3 text-[11px] text-[#f2efe9] relative">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#D97757]/20 flex items-center justify-center">
                      <AnthropicOfficialLogo className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-[10px] font-semibold text-[#D97757]">Claude</span>
                  </div>

                  <div className="text-[10.5px] font-mono text-zinc-400 mb-1">
                    Subject: <span className="text-white font-medium">{currentAngle.subject}</span>
                  </div>
                  <p className="text-[11px] text-[#e5e2da] leading-relaxed font-sans">
                    {currentAngle.body}
                  </p>

                  {/* Claude Bottom Toolbar */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.05] text-[9.5px] text-zinc-400">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        {copied ? <Check size={11} className="text-[#B8F36B]" /> : <Copy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <span className="text-white/10">|</span>
                      <ThumbsUp size={11} className="hover:text-white cursor-pointer" />
                      <ThumbsDown size={11} className="hover:text-white cursor-pointer" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveAngleIdx((prev) => (prev === 0 ? 1 : 0))}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      title="Regenerate with different angle"
                    >
                      <RotateCcw size={11} />
                      <span className="font-mono text-[9px]">Retry</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CHATGPT INTERFACE */}
            {activeModel === 'chatgpt' && (
              <div className="bg-[#212121] border border-[#383838] rounded-2xl p-3.5 text-text-primary font-sans">
                {/* ChatGPT Top Bar */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-white">ChatGPT 4o</span>
                    <ChevronDown size={11} className="text-zinc-400" />
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500 text-[9.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10A37F]" />
                    <span>Memory Full</span>
                  </div>
                </div>

                {/* ChatGPT User Speech Bubble (Aligned Right) */}
                <div className="bg-[#2f2f2f] text-white rounded-2xl rounded-tr-sm px-3 py-2 text-[10.5px] max-w-[88%] ml-auto mb-2.5 border border-white/[0.04]">
                  <p className="leading-snug">{currentAngle.userPrompt}</p>
                </div>

                {/* ChatGPT Assistant Response Block */}
                <div className="bg-[#171717] border border-[#10A37F]/20 rounded-xl p-3 text-[11px] text-[#ececec]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#10A37F] flex items-center justify-center text-white">
                      <OpenAIOfficialLogo className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-[10px] font-semibold text-[#10A37F]">ChatGPT</span>
                  </div>

                  <div className="text-[10.5px] font-mono text-zinc-400 mb-1">
                    Subject: <span className="text-white font-medium">{currentAngle.subject}</span>
                  </div>
                  <p className="text-[11px] text-zinc-200 leading-relaxed font-sans">
                    {currentAngle.body}
                  </p>

                  {/* ChatGPT Action Row */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.05] text-[9.5px] text-zinc-400">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        {copied ? <Check size={11} className="text-[#10A37F]" /> : <Copy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <span className="text-white/10">|</span>
                      <ThumbsUp size={11} className="hover:text-white cursor-pointer" />
                      <ThumbsDown size={11} className="hover:text-white cursor-pointer" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveAngleIdx((prev) => (prev === 0 ? 1 : 0))}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      title="Regenerate"
                    >
                      <RotateCcw size={11} />
                      <span className="font-mono text-[9px]">Regenerate</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. GEMINI INTERFACE */}
            {activeModel === 'gemini' && (
              <div className="bg-[#131314] border border-[#2b2c2f] rounded-2xl p-3.5 text-text-primary font-sans">
                {/* Gemini Top Bar */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <GeminiOfficialLogo className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold text-white">Gemini Advanced 1.5 Pro</span>
                    <ChevronDown size={11} className="text-zinc-400" />
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500 text-[9.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8AB4F8]" />
                    <span>2M context</span>
                  </div>
                </div>

                {/* Gemini User Prompt Pill */}
                <div className="bg-[#1e1f20] border border-white/[0.06] rounded-xl px-3 py-1.5 text-[10.5px] text-zinc-300 mb-2.5 font-sans">
                  <p className="leading-snug">{currentAngle.userPrompt}</p>
                </div>

                {/* Gemini Assistant Response Block */}
                <div className="bg-[#191a1b] border border-[#8AB4F8]/20 rounded-xl p-3 text-[11px] text-white">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles size={13} className="text-[#8AB4F8]" />
                    <span className="text-[10px] font-semibold text-[#8AB4F8]">Gemini</span>
                  </div>

                  <div className="text-[10.5px] font-mono text-zinc-400 mb-1">
                    Subject: <span className="text-white font-medium">{currentAngle.subject}</span>
                  </div>
                  <p className="text-[11px] text-zinc-100 leading-relaxed font-sans">
                    {currentAngle.body}
                  </p>

                  {/* Gemini Action Row */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/[0.05] text-[9.5px] text-zinc-400">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        {copied ? <Check size={11} className="text-[#8AB4F8]" /> : <Copy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      <span className="text-white/10">|</span>
                      <ThumbsUp size={11} className="hover:text-white cursor-pointer" />
                      <ThumbsDown size={11} className="hover:text-white cursor-pointer" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveAngleIdx((prev) => (prev === 0 ? 1 : 0))}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      title="Modify"
                    >
                      <RotateCcw size={11} />
                      <span className="font-mono text-[9px]">Modify</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* STAGE 05: Client Conversion (Email / WhatsApp Switcher)  */}
        {/* ======================================================== */}
        <div className="absolute left-[565px] top-[480px] z-10 w-[355px]">
          {/* Stage Annotation Header & Channel Switcher */}
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-secondary font-bold">
              05 // CLIENT CONVERSION
            </span>

            {/* Email / WhatsApp Channel Switcher */}
            <div className="flex items-center gap-0.5 bg-surface-container-lowest p-0.5 rounded-lg border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setConversionChannel('email')}
                className={`flex items-center gap-1 py-0.5 px-2 rounded-md text-[9.5px] font-medium transition-all ${
                  conversionChannel === 'email'
                    ? 'bg-[#1a73e8]/20 text-[#8ab4f8] border border-[#1a73e8]/40 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Mail size={10} />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => setConversionChannel('whatsapp')}
                className={`flex items-center gap-1 py-0.5 px-2 rounded-md text-[9.5px] font-medium transition-all ${
                  conversionChannel === 'whatsapp'
                    ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <WhatsAppOfficialLogo className="w-2.5 h-2.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* CHANNEL 1: AUTHENTIC EMAIL APP INTERFACE */}
          {conversionChannel === 'email' && (
            <div>
              {/* AUTHENTIC EMAIL CLIENT DRAFT WINDOW */}
              <div className="rounded-2xl bg-[#1e1f23] border border-white/[0.1] shadow-2xl overflow-hidden mb-2.5">
                {/* Window Header with macOS Window Controls */}
                <div className="bg-[#26282d] px-3.5 py-2 border-b border-white/[0.08] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-300 font-sans">
                    New Message
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block opacity-85" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block opacity-85" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block opacity-85" />
                  </div>
                </div>

                {/* Recipient Row */}
                <div className="px-3.5 py-1.5 border-b border-white/[0.05] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-zinc-500 font-medium text-[10px] w-6 shrink-0">To</span>
                    <div className="bg-[#2b2d33] border border-white/[0.08] px-2 py-0.5 rounded-full text-zinc-100 flex items-center gap-1.5 font-sans text-[10px] truncate">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#3d4452] text-[8px] font-bold text-zinc-200 flex items-center justify-center shrink-0">
                        M
                      </div>
                      <span className="font-semibold text-zinc-200">Marcus Vance</span>
                      <span className="text-zinc-400 font-mono text-[9px]">&lt;marcus@vesperjewelry.co&gt;</span>
                    </div>
                  </div>
                  <span className="text-zinc-500 text-[10px] shrink-0 font-sans">Cc Bcc</span>
                </div>

                {/* Subject Row */}
                <div className="px-3.5 py-1.5 border-b border-white/[0.05] flex items-center gap-2 text-[11px]">
                  <span className="text-zinc-500 font-medium text-[10px] w-6 shrink-0">Subj</span>
                  <span className="text-zinc-200 font-medium truncate font-sans text-[10.5px]">
                    {currentAngle.subject}
                  </span>
                </div>

                {/* Email Draft Body */}
                <div className="px-3.5 py-2.5 text-[11px] text-zinc-300 font-sans leading-relaxed min-h-[55px]">
                  <p>{currentAngle.body}</p>
                </div>

                {/* Email Compose Bottom Action Bar */}
                <div className="px-3 py-1.5 bg-[#26282d] border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    type="button"
                    className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium text-[10.5px] px-3 py-1 rounded-md flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Send size={10} className="fill-current" />
                    <span>Send</span>
                    <span className="border-l border-white/20 pl-1 ml-0.5 text-[8.5px]">▾</span>
                  </button>

                  {/* Formatting & Attachment Icons */}
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Paperclip size={11} className="hover:text-zinc-200 cursor-pointer transition-colors" />
                    <Link2 size={11} className="hover:text-zinc-200 cursor-pointer transition-colors" />
                    <Smile size={11} className="hover:text-zinc-200 cursor-pointer transition-colors" />
                    <span className="text-white/10">|</span>
                    <Trash2 size={11} className="text-zinc-500 hover:text-red-400 cursor-pointer transition-colors" />
                  </div>
                </div>
              </div>

              {/* REAL CLIENT INBOX THREAD / REPLY */}
              <div className="rounded-xl bg-[#1e1f23] border border-white/[0.08] shadow-lg overflow-hidden">
                <div className="px-3 py-1.5 bg-[#26282d] border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-4 h-4 rounded-full bg-[#3d4452] text-zinc-200 flex items-center justify-center font-bold text-[8px] uppercase shrink-0">
                      MV
                    </div>
                    <span className="text-[10.5px] font-semibold text-zinc-200 truncate">
                      Marcus Vance
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono truncate hidden sm:inline">
                      &lt;marcus@vesperjewelry.co&gt;
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
                    <span className="text-[9px] font-mono">18m ago</span>
                    <Star size={10} className="text-amber-400 fill-amber-400/20" />
                  </div>
                </div>

                <div className="p-3 text-[11px] text-zinc-200 font-sans leading-relaxed bg-[#18191c]/80 border-b border-white/[0.04]">
                  {currentAngle.clientReply}
                </div>

                {/* Email Action Bar: Standard Reply / Forward */}
                <div className="px-3 py-1.5 bg-[#26282d] flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#32343a] hover:bg-[#3d4047] text-zinc-300 text-[9.5px] font-medium border border-white/[0.06] transition-colors"
                  >
                    <Reply size={10} />
                    <span>Reply</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#32343a] hover:bg-[#3d4047] text-zinc-300 text-[9.5px] font-medium border border-white/[0.06] transition-colors"
                  >
                    <Forward size={10} />
                    <span>Forward</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CHANNEL 2: AUTHENTIC WHATSAPP CHAT INTERFACE */}
          {conversionChannel === 'whatsapp' && (
            <div className="rounded-2xl bg-[#111b21] border border-white/[0.1] shadow-2xl overflow-hidden">
              {/* WhatsApp Header Bar */}
              <div className="bg-[#202c33] px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#00a884] text-[#111b21] font-bold text-[9px] flex items-center justify-center shrink-0">
                    MV
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#e9edef] truncate leading-tight">
                      Marcus Vance
                    </div>
                    <div className="text-[9px] text-[#00a884] leading-tight flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]" />
                      <span>online</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-zinc-400">
                  <Video size={12} className="hover:text-zinc-200 cursor-pointer transition-colors" />
                  <Phone size={11} className="hover:text-zinc-200 cursor-pointer transition-colors" />
                  <MoreVertical size={12} className="hover:text-zinc-200 cursor-pointer transition-colors" />
                </div>
              </div>

              {/* WhatsApp Messages Canvas */}
              <div className="p-3 bg-[#0b141a] space-y-2.5 min-h-[195px] flex flex-col justify-end">
                {/* Date Divider */}
                <div className="text-center my-0.5">
                  <span className="px-2 py-0.5 rounded bg-[#182229] text-[8.5px] font-medium text-zinc-400 shadow-sm">
                    TODAY
                  </span>
                </div>

                {/* Outgoing Message (Sent by Hunter) */}
                <div className="ml-auto max-w-[86%] bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none px-2.5 py-1.5 text-[10.5px] shadow-sm font-sans">
                  <p className="leading-snug">{currentAngle.body}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[8.5px] text-emerald-200/70 font-mono">
                    <span>10:24 AM</span>
                    <CheckCheck size={11} className="text-[#53bdeb]" />
                  </div>
                </div>

                {/* Incoming Message (Client Reply from Marcus) */}
                <div className="mr-auto max-w-[86%] bg-[#202c33] text-[#e9edef] rounded-lg rounded-tl-none px-2.5 py-1.5 text-[10.5px] shadow-sm font-sans">
                  <p className="leading-snug">{currentAngle.clientReply}</p>
                  <div className="flex items-center justify-end mt-1 text-[8.5px] text-zinc-400 font-mono">
                    <span>10:42 AM</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Input Bar */}
              <div className="bg-[#202c33] px-2.5 py-2 border-t border-white/[0.06] flex items-center gap-2">
                <Smile size={13} className="text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors" />
                <Paperclip size={13} className="text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors" />
                <div className="flex-1 bg-[#2a3942] rounded-lg px-2.5 py-1 text-[10px] text-zinc-400 font-sans">
                  Type a message
                </div>
                <Mic size={13} className="text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE VERTICAL PIPELINE (Clean, spacious step layout)    */}
      {/* ======================================================== */}
      <div className="block md:hidden relative z-10 space-y-6">
        {/* Step 1: Social Signal */}
        <div className="p-4 rounded-2xl bg-surface border border-white/[0.08]">
          <div className="flex items-center justify-between text-[10px] font-mono text-primary mb-1">
            <span>01 // RAW BUYER SIGNAL</span>
            <span className="text-text-secondary">2h ago</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <LinkedinOfficialLogo className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-semibold text-text-primary">Marcus Vance (Founder @ Vesper)</span>
          </div>
          <p className="text-xs text-text-secondary">
            &quot;Starting a brand for luxury jewelry. Need a web designer who can build custom 3D visuals on Shopify Plus.&quot;
          </p>
        </div>

        {/* Step 2: Lead Hunter RAG AI */}
        <div className="p-4 rounded-2xl bg-surface-container border border-white/[0.08]">
          <div className="flex items-center justify-between text-[10px] font-mono text-primary mb-2">
            <div className="flex items-center gap-1.5">
              <CpuChipIcon className="w-3.5 h-3.5 text-primary" />
              <span>02 // RAG INTEL ENGINE</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 font-bold">
              Score: 9.4/10
            </span>
          </div>


          <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-white/[0.04] space-y-2 mb-2.5">
            <div>
              <span className="text-[9px] font-mono font-bold text-primary block mb-0.5">🧠 ONE-LINER</span>
              <p className="text-text-primary text-[10.5px] leading-snug">
                High-intent founder seeking custom 3D WebGL for Shopify Plus. Dealbreaker: mobile Safari checkout speed.
              </p>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div>
              <span className="text-[9px] font-mono font-bold text-[#E5C07B] block mb-0.5">🧩 CONTEXT YOU MIGHT MISS</span>
              <p className="text-text-secondary text-[10px] leading-snug">
                Direct project brief bypassing agencies: owner seeking direct specialist relationship for flagship luxury launch.
              </p>
            </div>
            <div className="h-px bg-white/[0.04]" />
            <div>
              <span className="text-[9px] font-mono font-bold text-[#FF6B6B] block mb-0.5">🔥 THE REAL X-FACTOR</span>
              <p className="text-text-secondary text-[10px] leading-snug">
                Stock 3D apps tank mobile checkout. Pitching Draco GLTF compression with sub-50ms load wins the deal.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[9.5px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono px-2 py-0.5 rounded bg-white/[0.05] text-text-secondary text-[9px]">Shopify Plus</span>
              <span className="font-mono px-2 py-0.5 rounded bg-white/[0.05] text-text-secondary text-[9px]">3D / WebGL</span>
              <span className="font-mono px-2 py-0.5 rounded bg-white/[0.05] text-text-secondary text-[9px]">Draco GLTF</span>
            </div>
            <span className="font-mono text-[#B8F36B] font-semibold text-[9px]">Intent: High</span>
          </div>
        </div>

        {/* Step 3: Authentic LeadCard in Feed */}
        <div className="p-4 rounded-[20px] bg-[#B8F36B] text-[#11150C] shadow-lg">
          <div className="flex items-center justify-between text-[9px] font-extrabold uppercase mb-1">
            <span>03 // DELIVERED TO YOUR FEED</span>
            <span>2h ago</span>
          </div>
          <h4 className="text-[11px] font-extrabold uppercase mb-1">LUXURY JEWELRY 3D VISUALIZER</h4>
          <p className="text-xs font-bold leading-snug mb-2.5">
            &quot;Starting a brand for luxury jewelry. Need a web designer who can build custom 3D visuals on Shopify Plus.&quot;
          </p>
          <div className="pt-2 border-t border-[#11150C]/15 flex items-center justify-between text-[10px]">
            <div>
              <div className="font-extrabold">Marcus Vance (Founder)</div>
              <div className="text-[#11150C]/75 font-mono text-[9px]">marcus@vesperjewelry.co</div>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#11150C] text-white font-extrabold uppercase text-[9px]">
              ✓ Claimed
            </span>
          </div>
        </div>

        {/* Step 4: Your AI Outreach */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-white/[0.1]">
          <div className="flex items-center justify-between text-[10px] font-mono text-primary mb-2">
            <span>04 // YOUR AI ENGINE</span>
            <button
              type="button"
              onClick={() => setActiveAngleIdx((prev) => (prev === 0 ? 1 : 0))}
              className="text-[10px] text-primary underline"
            >
              Angle {activeAngleIdx + 1}/2
            </button>
          </div>
          <div className="flex gap-1 mb-2.5">
            {(['claude', 'chatgpt', 'gemini'] as AiModelId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveModel(id)
                  setActiveAngleIdx(0)
                }}
                className={`flex-1 py-1 text-[10px] rounded font-medium ${
                  activeModel === id ? 'bg-primary/20 text-primary border border-primary/40' : 'text-text-secondary'
                }`}
              >
                {AI_MODELS[id].name}
              </button>
            ))}
          </div>
          <div className="bg-surface-container-lowest p-3 rounded-xl border border-white/[0.04]">
            <div className="text-[10px] font-mono text-zinc-400 mb-1">
              Subject: <span className="text-white font-medium">{currentAngle.subject}</span>
            </div>
            <p className="text-xs text-text-secondary font-sans leading-relaxed">
              {currentAngle.body}
            </p>
          </div>
        </div>

        {/* Step 5: Result */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-secondary font-bold">
              05 // CLIENT CONVERSION
            </span>
            <div className="flex items-center gap-0.5 bg-surface-container-lowest p-0.5 rounded-lg border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setConversionChannel('email')}
                className={`flex items-center gap-1 py-0.5 px-2 rounded-md text-[9.5px] font-medium ${
                  conversionChannel === 'email'
                    ? 'bg-[#1a73e8]/20 text-[#8ab4f8] border border-[#1a73e8]/40 font-semibold'
                    : 'text-zinc-400'
                }`}
              >
                <Mail size={10} />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => setConversionChannel('whatsapp')}
                className={`flex items-center gap-1 py-0.5 px-2 rounded-md text-[9.5px] font-medium ${
                  conversionChannel === 'whatsapp'
                    ? 'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 font-semibold'
                    : 'text-zinc-400'
                }`}
              >
                <WhatsAppOfficialLogo className="w-2.5 h-2.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {conversionChannel === 'email' ? (
            <div className="rounded-2xl bg-[#1e1f23] border border-white/[0.1] shadow-lg overflow-hidden">
              <div className="px-3.5 py-2 bg-[#26282d] border-b border-white/[0.08] flex items-center justify-between text-[10px]">
                <span className="font-sans text-zinc-300 font-medium">Inbox Conversation</span>
                <div className="flex items-center gap-1.5 text-zinc-400 text-[9px] font-mono">
                  <span>18m ago</span>
                  <Star size={10} className="text-amber-400 fill-amber-400/20" />
                </div>
              </div>
              <div className="p-3 bg-[#18191c]/80 border-b border-white/[0.04]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-4 h-4 rounded-full bg-[#3d4452] text-zinc-200 flex items-center justify-center font-bold text-[8px] uppercase shrink-0">
                    MV
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200">Marcus Vance</span>
                  <span className="text-[9px] text-zinc-500 font-mono">&lt;marcus@vesperjewelry.co&gt;</span>
                </div>
                <p className="text-xs text-zinc-200 font-sans leading-relaxed">
                  {currentAngle.clientReply}
                </p>
              </div>
              <div className="px-3.5 py-1.5 bg-[#26282d] flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#32343a] text-zinc-300 text-[9.5px] font-medium border border-white/[0.06]"
                >
                  <Reply size={10} />
                  <span>Reply</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#32343a] text-zinc-300 text-[9.5px] font-medium border border-white/[0.06]"
                >
                  <Forward size={10} />
                  <span>Forward</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#111b21] border border-white/[0.1] shadow-lg overflow-hidden">
              <div className="bg-[#202c33] px-3.5 py-2 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#00a884] text-[#111b21] font-bold text-[9px] flex items-center justify-center shrink-0">
                    MV
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#e9edef] truncate">
                      Marcus Vance
                    </div>
                    <div className="text-[9px] text-[#00a884] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00a884]" />
                      <span>online</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-zinc-400">
                  <Video size={12} />
                  <Phone size={11} />
                  <MoreVertical size={12} />
                </div>
              </div>
              <div className="p-3 bg-[#0b141a] space-y-2">
                <div className="ml-auto max-w-[88%] bg-[#005c4b] text-[#e9edef] rounded-lg rounded-tr-none px-2.5 py-1.5 text-[11px] font-sans">
                  <p>{currentAngle.body}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[8.5px] text-emerald-200/70 font-mono">
                    <span>10:24 AM</span>
                    <CheckCheck size={11} className="text-[#53bdeb]" />
                  </div>
                </div>
                <div className="mr-auto max-w-[88%] bg-[#202c33] text-[#e9edef] rounded-lg rounded-tl-none px-2.5 py-1.5 text-[11px] font-sans">
                  <p>{currentAngle.clientReply}</p>
                  <div className="flex items-center justify-end mt-1 text-[8.5px] text-zinc-400 font-mono">
                    <span>10:42 AM</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

