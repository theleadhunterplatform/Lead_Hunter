import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy · LeadHunterClub',
  description:
    'How LeadHunterClub collects, uses, shares, and protects personal data — including your rights under Indian law.',
}

const OPERATOR = 'Aman Agarwal'
const ADDRESS = 'Viman Nagar, Pune, Maharashtra, India'
const PRIVACY_EMAIL = 'privacy@theleadhunterclub.com'
const SUPPORT_EMAIL = 'support@theleadhunterclub.com'
const SITE = 'https://leadhunterclub.com'
const LAST_UPDATED = '13 October 2026'

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string
  n: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-white tracking-tight mb-3">
        <span className="text-primary font-mono text-sm mr-2">{n}</span>
        {title}
      </h2>
      <div className="text-sm text-text-secondary leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

function TocLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a href={href} className="text-primary hover:text-primary/80 text-[13px] leading-relaxed">
        {label}
      </a>
    </li>
  )
}

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Last updated: {LAST_UPDATED} · Website:{' '}
            <a href={SITE} className="text-primary hover:text-primary/80">
              leadhunterclub.com
            </a>
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            Operator: <span className="text-white font-semibold">{OPERATOR}</span>, {ADDRESS},
            India · Privacy contact:{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:text-primary/80">
              {PRIVACY_EMAIL}
            </a>{' '}
            · Support:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:text-primary/80">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </header>

        <nav
          aria-label="Contents"
          className="rounded-2xl bg-surface/80 border border-white/[0.08] p-6"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
            Contents
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            <TocLink href="#scope" label="1. What this policy covers" />
            <TocLink href="#collect" label="2. Personal data we collect" />
            <TocLink href="#use" label="3. How we use your data" />
            <TocLink href="#leads" label="4. How lead data is collected" />
            <TocLink href="#sharing" label="5. Who we share data with" />
            <TocLink href="#transfers" label="6. International transfers" />
            <TocLink href="#retention" label="7. Data retention" />
            <TocLink href="#rights" label="8. Your rights" />
            <TocLink href="#security" label="9. Security" />
            <TocLink href="#children" label="10. Children" />
            <TocLink href="#changes" label="11. Changes to this policy" />
            <TocLink href="#contact" label="12. Contact" />
          </ul>
        </nav>

        <Section id="scope" n="01" title="What this policy covers">
          <p>
            This Privacy Policy explains what personal data we collect when you visit
            LeadHunterClub, create an account, buy credits, or use our lead-discovery and
            outreach tools — and how we use, share, protect, and delete it. It also explains
            the rights available to you under India&apos;s Digital Personal Data Protection Act,
            2023 (DPDP Act) and, where applicable, other laws such as the EU General Data
            Protection Regulation (GDPR).
          </p>
        </Section>

        <Section id="collect" n="02" title="Personal data we collect">
          <p className="text-white font-semibold">2.1 — Data you provide</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <span className="text-white">Account data:</span> full name, email address, phone
              number, city (collected at registration and onboarding).
            </li>
            <li>
              <span className="text-white">Profile data:</span> portfolio/website URL, social
              profiles (LinkedIn, Instagram, Dribbble, Behance, GitHub, Twitter/X), services
              you offer, lead categories you want, outreach experience, and how you discovered
              us.
            </li>
            <li>
              <span className="text-white">Communications:</span> support tickets, feedback
              messages, replies to our emails.
            </li>
            <li>
              <span className="text-white">Newsletter signup:</span> email address, only if you
              opt in.
            </li>
          </ul>
          <p className="text-white font-semibold pt-2">2.2 — Data generated by your use</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Credits balance, plan type, credit purchases, leads viewed/saved/revealed, AI
              reports generated, referrals, and activity needed to run the service.
            </li>
            <li>
              Technical data: device/browser type, IP address, pages visited, timestamps — used
              for security, fraud prevention, and reliability.
            </li>
          </ul>
          <p className="text-white font-semibold pt-2">2.3 — Payment data</p>
          <p>
            Payments are processed by <span className="text-white">Razorpay</span>. We receive
            only Razorpay customer/subscription identifiers, payment status, and billing
            metadata. <span className="text-white">We never see or store your full card
            number, CVV, or banking password.</span>
          </p>
          <p className="text-white font-semibold pt-2">2.4 — Cookies</p>
          <p>
            We use a single essential cookie, <code className="text-white">__session</code>, to
            keep you logged in. We do <span className="text-white">not</span> use advertising,
            analytics, or cross-site tracking cookies. Full details in our{' '}
            <Link href="/cookies" className="text-primary hover:text-primary/80">
              Cookie Notice
            </Link>
            .
          </p>
        </Section>

        <Section id="use" n="03" title="How we use your data">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To create and secure your account (including email verification and approval).</li>
            <li>
              To provide the service: showing lead lists, revealing contact details you unlock
              with credits, generating AI intelligence reports, and drafting outreach emails.
            </li>
            <li>To process payments, maintain your credits balance, and prevent fraud/abuse.</li>
            <li>
              To provide customer support and send essential service messages (verification,
              receipts, policy changes).
            </li>
            <li>
              To send platform updates and newsletters <span className="text-white">only where
              you have opted in</span>, with one-click unsubscribe in every message.
            </li>
            <li>To comply with law and enforce our Terms of Service.</li>
          </ul>
        </Section>

        <Section id="leads" n="04" title="How lead data on our platform is collected">
          <p>LeadHunterClub shows business leads assembled from:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <span className="text-white">Public posts</span> on social platforms, communities,
              and forums — collected through scraping infrastructure (Apify), and
            </li>
            <li>
              <span className="text-white">Professional data-enrichment providers</span> (such
              as Hunter, Apollo, ContactOut, and ContactCompass) that aggregate publicly
              available business contact information.
            </li>
          </ul>
          <p>
            We display this information for professional outreach purposes.{' '}
            <span className="text-white">
              If you are a person whose details appear on our platform and want them removed,
              email {PRIVACY_EMAIL} from a verifiable address — we will delete your lead
              record.
            </span>{' '}
            We respond to valid removal requests within 30 days.
          </p>
        </Section>

        <Section id="sharing" n="05" title="Who we share data with">
          <p>
            We share data only with processors that run the service, under appropriate
            contractual protections:
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-surface-elevated text-left">
                  <th className="px-4 py-2.5 font-semibold text-white">Purpose</th>
                  <th className="px-4 py-2.5 font-semibold text-white">Provider</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {[
                  ['Authentication', 'Firebase / Google'],
                  ['Payments', 'Razorpay'],
                  ['Hosting', 'Vercel'],
                  ['Database', 'Supabase'],
                  ['Lead scraping', 'Apify'],
                  ['Lead enrichment', 'Hunter, Apollo, ContactOut, ContactCompass'],
                  ['AI reports & drafts', 'OpenRouter / Google Gemini'],
                  ['Transactional email', 'Resend'],
                  ['Newsletter email', 'Brevo'],
                ].map(([purpose, provider]) => (
                  <tr key={purpose}>
                    <td className="px-4 py-2.5 text-white">{purpose}</td>
                    <td className="px-4 py-2.5">{provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            We do <span className="text-white">not</span> sell your personal data. We may
            disclose data if required by law or to protect the rights, safety, and property
            of LeadHunterClub, our users, or the public.
          </p>
        </Section>

        <Section id="transfers" n="06" title="International transfers">
          <p>
            Some providers (e.g., Firebase/Google, Razorpay infrastructure) may process data
            outside India. Where cross-border transfer occurs, we take reasonable safeguards as
            required by applicable law.
          </p>
        </Section>

        <Section id="retention" n="07" title="Data retention">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <span className="text-white">Account data</span> — kept until you delete your
              account (Settings → Delete Account erases your profile; some transactional
              records may be retained as required by tax/payment law).
            </li>
            <li>
              <span className="text-white">Lead records</span> — kept until removed by us or on
              a valid opt-out request.
            </li>
            <li>
              <span className="text-white">Support tickets & payment records</span> — retained
              only as long as needed for support and legal compliance.
            </li>
            <li>
              <span className="text-white">Newsletter list</span> — until you unsubscribe.
            </li>
          </ul>
        </Section>

        <Section id="rights" n="08" title="Your rights">
          <p>Under applicable law you have the right to:</p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              <span className="text-white">Access</span> a summary of the personal data we hold
              about you;
            </li>
            <li>
              <span className="text-white">Correct</span> inaccurate data (editable directly in
              Settings);
            </li>
            <li>
              <span className="text-white">Erase</span> your data (self-serve account deletion,
              or by emailing us);
            </li>
            <li>
              <span className="text-white">Withdraw consent</span> at any time (e.g.,
              unsubscribe from marketing — this does not affect prior lawful processing);
            </li>
            <li>
              <span className="text-white">Grievance redressal</span> — raise a complaint with
              our Grievance Officer: {OPERATOR},{' '}
              <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:text-primary/80">
                {PRIVACY_EMAIL}
              </a>
              ;
            </li>
            <li>
              <span className="text-white">Nominate</span> another person to exercise your
              rights on your behalf, where applicable.
            </li>
          </ol>
          <p>
            EU/EEA users additionally have the right to object to processing and to lodge a
            complaint with their local supervisory authority. To exercise any right, email{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:text-primary/80">
              {PRIVACY_EMAIL}
            </a>{' '}
            — we respond within 30 days.
          </p>
        </Section>

        <Section id="security" n="09" title="Security">
          <p>
            We protect data with HTTPS encryption in transit, authenticated sessions,
            role-based access control, and server-side access to sensitive keys. No system is
            100% secure; if we become aware of a breach affecting your data, we will notify
            you and the authorities as required by law.
          </p>
        </Section>

        <Section id="children" n="10" title="Children">
          <p>
            LeadHunterClub is a <span className="text-white">business service for people aged
            18 and over</span>. We do not knowingly process data of minors.
          </p>
        </Section>

        <Section id="changes" n="11" title="Changes to this policy">
          <p>
            We may update this policy and will revise the &quot;Last updated&quot; date.
            Material changes will be notified by email or in-app notice.
          </p>
        </Section>

        <Section id="contact" n="12" title="Contact">
          <p>
            <span className="text-white font-semibold">{OPERATOR}</span> — {ADDRESS}, India
            <br />
            Privacy: {' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:text-primary/80">
              {PRIVACY_EMAIL}
            </a>{' '}
            · Support:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:text-primary/80">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Section>

        <footer className="border-t border-white/[0.07] pt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-[12.5px] text-white/40">
          <span>© 2026 LeadHunterClub</span>
          <span className="flex gap-4">
            <Link href="/terms" className="hover:text-white/70 transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="hover:text-white/70 transition-colors">
              Cookie Notice
            </Link>
          </span>
        </footer>
      </div>
    </div>
  )
}
