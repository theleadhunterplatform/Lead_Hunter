import { buildLeadDropAlertEmail } from '../utils/email.service';

describe('Lead Drop Alert Email Template', () => {
    const sampleLeads = [
        {
            id: 'lead-uuid-1234',
            title: 'Need a Full Stack Next.js & Supabase Developer',
            niche: 'Web Development',
            platform: 'LinkedIn',
            content: 'We need an experienced full-stack developer to build our SaaS MVP within 4 weeks. Remote, competitive pay.',
        },
        {
            id: 'lead-uuid-5678',
            title: 'Media Buyer Wanted for E-commerce DTC Brand',
            niche: 'Paid Ads & Marketing',
            platform: 'LinkedIn',
            content: 'Looking for a media buyer with proven $50k+/mo ROAS experience on Meta and TikTok ads.',
        },
    ];

    it('builds single lead drop alert email with title and deep-link to lead', () => {
        const { subject, html } = buildLeadDropAlertEmail('Alex', [sampleLeads[0]], 'https://www.theleadhunterclub.com');

        expect(subject).toContain('New Lead Alert: Need a Full Stack Next.js & Supabase Developer');
        expect(html).toContain('Need a Full Stack Next.js &amp; Supabase Developer');
        expect(html).toContain('https://www.theleadhunterclub.com/leads?lead=lead-uuid-1234');
        expect(html).toContain('View &amp; Claim Lead');
        expect(html).toContain('Web Development');
        expect(html).toContain('Alex');
    });

    it('builds batch lead drop alert email with multiple leads and individual links', () => {
        const { subject, html } = buildLeadDropAlertEmail('Sarah', sampleLeads, 'https://www.theleadhunterclub.com');

        expect(subject).toContain('2 New Verified Leads Just Approved');
        expect(html).toContain('Need a Full Stack Next.js &amp; Supabase Developer');
        expect(html).toContain('Media Buyer Wanted for E-commerce DTC Brand');
        expect(html).toContain('https://www.theleadhunterclub.com/leads?lead=lead-uuid-1234');
        expect(html).toContain('https://www.theleadhunterclub.com/leads?lead=lead-uuid-5678');
        expect(html).toContain('Paid Ads &amp; Marketing');
        expect(html).toContain('Open Lead Hunter Feed');
    });

    it('gracefully handles missing title by using niche fallback', () => {
        const fallbackLead = {
            id: 'lead-fallback-999',
            title: null,
            niche: 'UI/UX Design',
            platform: 'LinkedIn',
            content: 'Looking for a Figma designer to build our design system.',
        };

        const { subject, html } = buildLeadDropAlertEmail('Jordan', [fallbackLead], 'https://www.theleadhunterclub.com');

        expect(subject).toContain('UI/UX Design Lead');
        expect(html).toContain('UI/UX Design Opportunity');
        expect(html).toContain('https://www.theleadhunterclub.com/leads?lead=lead-fallback-999');
    });
});
