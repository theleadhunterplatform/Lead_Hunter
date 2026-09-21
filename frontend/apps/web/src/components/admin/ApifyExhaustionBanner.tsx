'use client'

import Link from 'next/link'
import { ExclamationTriangleIcon, ArrowRightIcon } from '@heroicons/react/24/solid'

interface Props {
  activeKeys: number
  totalKeys: number
  totalRemaining: number
}

export function ApifyExhaustionBanner({ activeKeys, totalKeys, totalRemaining }: Props) {
  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-red-500/15 to-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex-shrink-0">
          <ExclamationTriangleIcon className="w-3.5 h-3.5 animate-pulse" />
        </span>
        <div>
          <span className="font-semibold text-white">
            Apify Scraper Tokens Exhausted:
          </span>{' '}
          <span className="text-zinc-300">
            {totalKeys === 0
              ? 'No Apify API keys configured. Scrapers cannot gather new leads.'
              : `All keys are inactive or out of monthly quota (${activeKeys}/${totalKeys} active, ${totalRemaining} scrapes remaining). Automatic lead scraping has paused.`}
          </span>
        </div>
      </div>

      <Link
        href="/admin/tokens"
        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white font-medium border border-amber-500/30 transition-all ml-4"
      >
        <span>Add Keys</span>
        <ArrowRightIcon className="w-3 h-3" />
      </Link>
    </div>
  )
}
