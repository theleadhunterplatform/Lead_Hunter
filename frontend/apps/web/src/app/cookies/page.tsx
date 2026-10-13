import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Notice · LeadHunterClub',
  description: 'The single cookie LeadHunterClub uses — and the tracking cookies we don’t.',
}

const PRIVACY_EMAIL = 'privacy@theleadhunterclub.com'
const LAST_UPDATED = '13 October 2026'

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-bg-main text-text-primary p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-white transition-colors"
        >
          <span aria-hidden>←</span> Back
        </Link>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold uppercase tracking-wider text-primary">
            Legal
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Cookie Notice
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <div className="rounded-2xl bg-surface/80 border border-white/[0.08] p-6 space-y-4">
          <p className="text-xl font-bold text-white tracking-tight">
            We use exactly one cookie.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-surface-elevated text-left">
                  <th className="px-4 py-2.5 font-semibold text-white">Cookie</th>
                  <th className="px-4 py-2.5 font-semibold text-white">Purpose</th>
                  <th className="px-4 py-2.5 font-semibold text-white">Type</th>
                  <th className="px-4 py-2.5 font-semibold text-white">Lifetime</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2.5 text-white font-mono">__session</td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    Keeps you signed in securely after login
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    Essential (strictly necessary)
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    Up to 30 days while &quot;stay signed in&quot; is on; browser-session only
                    when it is off
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">
            What we <span className="text-primary">don&apos;t</span> use
          </h2>
          <div className="text-sm text-text-secondary leading-relaxed">
            <p>
              No advertising cookies. No analytics trackers. No social media pixels. No
              cross-site profiling cookies. Your browsing on LeadHunterClub is not tracked for
              advertising by us or by any third party embedded in our pages.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white tracking-tight">Your choices</h2>
          <div className="text-sm text-text-secondary leading-relaxed space-y-3">
            <p>
              You can delete or block cookies in your browser settings at any time. Because{' '}
              <code className="text-white">__session</code> is essential for login, blocking it
              will prevent you from staying signed in. Clearing it simply logs you out —
              nothing else is affected.
            </p>
            <p>
              Questions:{' '}
              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="text-primary hover:text-primary/80"
              >
                {PRIVACY_EMAIL}
              </a>
            </p>
          </div>
        </section>

        <footer className="border-t border-white/[0.07] pt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-[12.5px] text-white/40">
          <span>© 2026 LeadHunterClub</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors">
              Terms of Service
            </Link>
          </span>
        </footer>
      </div>
    </div>
  )
}
