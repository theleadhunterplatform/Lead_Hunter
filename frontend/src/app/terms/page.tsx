import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-hunter-black text-zinc-300 p-8 max-w-3xl mx-auto prose prose-invert">
      <Link href="/" className="text-hunter-orange text-sm font-bold uppercase tracking-widest no-underline">← Home</Link>
      <h1 className="font-display font-black uppercase text-hunter-orange">Terms of Service</h1>
      <p className="text-sm text-zinc-500">Last updated: June 2026</p>

      <h2>Service</h2>
      <p>Lead Hunter provides lead intelligence and CRM tools. Leads are curated by platform administrators and made available for claiming.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Use outreach only for lawful business purposes.</li>
        <li>Do not spam, harass, or contact individuals who have opted out.</li>
        <li>Do not attempt to abuse scraping, tokens, or API limits.</li>
      </ul>

      <h2>Accounts</h2>
      <p>You are responsible for your credentials. Invited users must change temporary passwords promptly.</p>

      <h2>Data accuracy</h2>
      <p>Enriched emails and contact data may be unverified. Confirm before high-stakes outreach.</p>

      <h2>Liability</h2>
      <p>The service is provided as-is. The operator is not liable for outreach outcomes or third-party data accuracy.</p>
    </div>
  );
}
