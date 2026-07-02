import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-hunter-black text-zinc-300 p-8 max-w-3xl mx-auto prose prose-invert">
      <Link href="/" className="text-hunter-orange text-sm font-bold uppercase tracking-widest no-underline">← Home</Link>
      <h1 className="font-display font-black uppercase text-hunter-orange">Privacy Policy</h1>
      <p className="text-sm text-zinc-500">Last updated: June 2026</p>

      <h2>What we collect</h2>
      <p>Account information (name, email), usage data (claims, CRM activity), and lead data sourced from public social posts and enrichment providers.</p>

      <h2>How we use it</h2>
      <p>To operate the Lead Hunter platform: qualifying leads, generating intelligence reports, and enabling outreach you initiate.</p>

      <h2>Third parties</h2>
      <p>We use Apify, Hunter.io, Contact Compass, and OpenRouter to scrape and enrich data. Outreach email is sent via your configured email provider (Resend or SMTP).</p>

      <h2>Your rights</h2>
      <p>Contact your administrator to update or delete your account. For data requests, email the platform operator.</p>

      <h2>Contact</h2>
      <p>Questions about this policy: contact your Lead Hunter administrator.</p>
    </div>
  );
}
