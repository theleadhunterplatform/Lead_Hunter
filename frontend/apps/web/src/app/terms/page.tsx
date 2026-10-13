import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service · LeadHunterClub',
  description:
    'The terms governing your use of LeadHunterClub — plans, credits, billing, acceptable use, and liability.',
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

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Last updated: {LAST_UPDATED} · Website:{' '}
            <a href={SITE} className="text-primary hover:text-primary/80">
              leadhunterclub.com
            </a>
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            Operator: <span className="text-white font-semibold">{OPERATOR}</span>, {ADDRESS},
            India
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
            <TocLink href="#agreement" label="1. Agreement to terms" />
            <TocLink href="#eligibility" label="2. Eligibility & account approval" />
            <TocLink href="#billing" label="3. Plans, credits & billing" />
            <TocLink href="#refunds" label="4. Refunds" />
            <TocLink href="#service" label="5. The service" />
            <TocLink href="#acceptable-use" label="6. Acceptable use" />
            <TocLink href="#outreach" label="7. Your outreach is your responsibility" />
            <TocLink href="#removal" label="8. Removal requests by leads" />
            <TocLink href="#ip" label="9. Intellectual property" />
            <TocLink href="#third-parties" label="10. Third-party platforms & services" />
            <TocLink href="#termination" label="11. Suspension & termination" />
            <TocLink href="#disclaimers" label="12. Disclaimers" />
            <TocLink href="#liability" label="13. Limitation of liability" />
            <TocLink href="#indemnity" label="14. Indemnity" />
            <TocLink href="#law" label="15. Governing law & disputes" />
            <TocLink href="#changes" label="16. Changes to these terms" />
            <TocLink href="#contact" label="17. Contact" />
          </ul>
        </nav>

        <Section id="agreement" n="01" title="Agreement to terms">
          <p>
            By creating an account or using LeadHunterClub (&quot;Service&quot;), you agree to
            these Terms of Service (&quot;Terms&quot;) and our{' '}
            <Link href="/privacy" className="text-primary hover:text-primary/80">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Service. &quot;You&quot; means the individual
            or the organization on whose behalf you register.
          </p>
        </Section>

        <Section id="eligibility" n="02" title="Eligibility & account approval">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              You must be <span className="text-white">at least 18 years old</span> and capable
              of entering a binding contract.
            </li>
            <li>
              Accounts require email verification and, at our discretion,{' '}
              <span className="text-white">admin approval</span> before activation. We may
              refuse or pause registration.
            </li>
            <li>
              You are responsible for all activity under your account and for keeping your
              credentials secure.
            </li>
          </ul>
        </Section>

        <Section id="billing" n="03" title="Plans, credits & billing">
          <p className="text-white font-semibold">3.1 — What we sell</p>
          <p>
            Access to the Service is sold through monthly subscription plans and prepaid credit
            (&quot;credits&quot;) top-ups, consumed when you reveal contact details, generate
            reports, or send outreach. Current pricing:{' '}
            <a href={`${SITE}/pricing`} className="text-primary hover:text-primary/80">
              leadhunterclub.com/pricing
            </a>{' '}
            — the pricing page governs in case of any difference with this document.
          </p>
          <p className="text-white font-semibold pt-2">3.2 — Plans</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <span className="text-white">Free Starter</span> — 50 credits per month, no card
              required.
            </li>
            <li>
              <span className="text-white">Freelancer Pro</span> — ₹999/month, 1,000 credits
              per month.
            </li>
          </ul>
          <p className="text-white font-semibold pt-2">3.3 — Top-ups</p>
          <p>
            Available to active paid plans only: 125 credits — ₹199; 275 credits — ₹399; 450
            credits — ₹599. Top-ups stack on top of your monthly allowance.
          </p>
          <p className="text-white font-semibold pt-2">3.4 — Reveal costs</p>
          <p>
            Revealing a lead&apos;s contact details costs credits based on what data is
            available: email — 10, phone — 12, phone + email — 15, profile link — 5. The exact
            cost is always shown in the app before you confirm a reveal.
          </p>
          <p className="text-white font-semibold pt-2">3.5 — Rollover</p>
          <p>
            Unused credits roll over for <span className="text-white">15 days</span> when your
            plan renews; after that, expired rollover credits are removed. The exact expiry
            and rollover rules in force are those displayed in the app, which govern.
          </p>
          <p className="text-white font-semibold pt-2">3.6 — Renewal & cancellation</p>
          <p>
            Paid plans auto-renew monthly via Razorpay until cancelled. You can cancel or
            downgrade anytime in Settings; downgrading takes effect at the next billing date
            and resets you to Free Starter (credits reset per plan rules). Credits are{' '}
            <span className="text-white">non-refundable and non-convertible to cash</span>.
          </p>
          <p className="text-white font-semibold pt-2">3.7 — Changes</p>
          <p>
            We may change prices or plan contents with at least 30 days&apos; notice; changes
            apply from your next renewal.
          </p>
        </Section>

        <Section id="refunds" n="04" title="Refunds">
          <p>
            Except where required by applicable law,{' '}
            <span className="text-white">
              all sales are final and no refunds are issued once credits have been consumed or
              a billing cycle has begun
            </span>
            . If a payment was taken in error or a duplicate charge occurred, contact{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:text-primary/80">
              {SUPPORT_EMAIL}
            </a>{' '}
            within 14 days and we will investigate.
          </p>
        </Section>

        <Section id="service" n="05" title="The service">
          <p className="text-white font-semibold">5.1 — Lead data</p>
          <p>
            The Service displays business contact information and AI-generated intelligence
            about leads, assembled from publicly available sources and data-enrichment
            providers (see Privacy Policy §4). Lead data is provided{' '}
            <span className="text-white">&quot;as is&quot;</span> — we do not warrant that any
            email, phone number, role, or company detail is accurate, complete, current, or
            that outreach to any lead will succeed.{' '}
            <span className="text-white">
              You are responsible for verifying information before relying on it.
            </span>
          </p>
          <p className="text-white font-semibold pt-2">5.2 — AI-generated content</p>
          <p>
            Intelligence reports and outreach drafts are machine-generated, may be inaccurate,
            and must be reviewed by you before sending.
          </p>
          <p className="text-white font-semibold pt-2">5.3 — Availability</p>
          <p>
            We do not guarantee uninterrupted availability; the Service may be modified,
            suspended, or discontinued with reasonable notice.
          </p>
        </Section>

        <Section id="acceptable-use" n="06" title="Acceptable use">
          <p>You must not:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>use the Service for spam, harassment, fraud, or any unlawful purpose;</li>
            <li>
              <span className="text-white">
                resell, redistribute, sublicense, or bulk-export data obtained through the
                Service
              </span>{' '}
              — access is personal to your account;
            </li>
            <li>
              scrape, crawl, or extract the lead database by automated means outside the
              Service&apos;s intended interfaces;
            </li>
            <li>attempt to bypass credits, security, rate limits, or admin approval;</li>
            <li>
              misrepresent your identity, infringe third-party rights, or upload malicious
              content;
            </li>
            <li>reverse-engineer the Service except to the extent permitted by law.</li>
          </ul>
          <p>We may suspend or terminate accounts that violate this section.</p>
        </Section>

        <Section id="outreach" n="07" title="Your outreach is your legal responsibility">
          <p>
            The Service can draft and send outreach emails to leads.{' '}
            <span className="text-white">
              You are the sender of those messages and are solely responsible for complying
              with all applicable anti-spam, data-protection, and telemarketing laws
            </span>{' '}
            — including India&apos;s DPDP Act, the US CAN-SPAM Act, the EU GDPR/ePrivacy
            rules, and local do-not-contact requirements. You must honor opt-out requests
            promptly. We provide unsubscribe handling tools; using them is mandatory for any
            bulk outreach.
          </p>
        </Section>

        <Section id="removal" n="08" title="Removal requests by leads">
          <p>
            If a person asks to be removed from the platform, email{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:text-primary/80">
              {PRIVACY_EMAIL}
            </a>
            . We will delete the corresponding lead record. You must also stop contacting that
            person.
          </p>
        </Section>

        <Section id="ip" n="09" title="Intellectual property">
          <p>
            The Service — software, design, branding, AI prompts, and platform content —
            belongs to {OPERATOR} and is protected by law. We grant you a limited,
            non-exclusive, non-transferable license to use the Service per these Terms.
            Feedback you submit may be used to improve the Service without obligation.
          </p>
        </Section>

        <Section id="third-parties" n="10" title="Third-party platforms & services">
          <p>
            LeadHunterClub is{' '}
            <span className="text-white">
              not affiliated with, endorsed by, or sponsored by LinkedIn, Reddit, X,
              Instagram, or any other platform
            </span>{' '}
            whose public content may appear as leads. Use of third-party services (Razorpay,
            data providers, AI providers) is governed by their own terms; we are not liable
            for their acts or outages.
          </p>
        </Section>

        <Section id="termination" n="11" title="Suspension & termination">
          <p>
            We may suspend or terminate your access if you breach these Terms, if required by
            law, or if the Service is discontinued. You may delete your account anytime in
            Settings. On termination, your right to use the Service ends; provisions that by
            nature should survive (payment obligations, disclaimers, liability limits,
            indemnity) survive.
          </p>
        </Section>

        <Section id="disclaimers" n="12" title="Disclaimers">
          <p>
            <span className="text-white">
              To the maximum extent permitted by law, the Service is provided &quot;as
              is&quot; and &quot;as available,&quot; without warranties of any kind — express,
              implied, or statutory — including merchantability, fitness for a particular
              purpose, and non-infringement.
            </span>{' '}
            We do not warrant lead accuracy, deliverability, or any particular outcome from
            using the Service.
          </p>
        </Section>

        <Section id="liability" n="13" title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, {OPERATOR} and its directors, employees,
            and partners shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, or loss of profits, data, or goodwill.{' '}
            <span className="text-white">
              Our total liability for any claim arising out of the Service shall not exceed
              the amount you paid to us in the 3 months preceding the claim.
            </span>{' '}
            Nothing in these Terms limits liability that cannot be limited under applicable
            law (including consumer rights under the Consumer Protection Act, 2019).
          </p>
        </Section>

        <Section id="indemnity" n="14" title="Indemnity">
          <p>
            You agree to indemnify and hold harmless {OPERATOR} from claims arising out of
            (a) your use of the Service, (b) your outreach communications, or (c) your breach
            of these Terms.
          </p>
        </Section>

        <Section id="law" n="15" title="Governing law & disputes">
          <p>
            These Terms are governed by the laws of <span className="text-white">India</span>.
            Any dispute shall be subject to the exclusive jurisdiction of the courts at{' '}
            <span className="text-white">Pune, Maharashtra, India</span>. Before filing a
            claim, you agree to attempt resolution by emailing{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:text-primary/80">
              {SUPPORT_EMAIL}
            </a>{' '}
            and allowing 30 days for good-faith resolution.
          </p>
        </Section>

        <Section id="changes" n="16" title="Changes to these terms">
          <p>
            We may update these Terms; the &quot;Last updated&quot; date will change, and
            material changes will be notified in-app or by email. Continued use after the
            effective date constitutes acceptance.
          </p>
        </Section>

        <Section id="contact" n="17" title="Contact">
          <p>
            <span className="text-white font-semibold">{OPERATOR}</span> — {ADDRESS}, India
            <br />
            Support:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:text-primary/80">
              {SUPPORT_EMAIL}
            </a>{' '}
            · Privacy/Grievance:{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:text-primary/80">
              {PRIVACY_EMAIL}
            </a>
          </p>
        </Section>

        <footer className="border-t border-white/[0.07] pt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-[12.5px] text-white/40">
          <span>© 2026 LeadHunterClub</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">
              Privacy Policy
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
