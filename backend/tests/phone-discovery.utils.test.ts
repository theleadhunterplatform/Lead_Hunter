import {
    extractAllPhonesFromHtml,
    extractAllPhonesFromText,
    extractPhoneFromText,
} from '../src/utils/lead-enrichment.utils';
import { domainToWebsiteUrl, normalizeWebsiteUrl } from '../src/utils/website-phone-discovery.utils';

describe('extractAllPhonesFromText', () => {
    it('returns multiple distinct numbers from one block', () => {
        const phones = extractAllPhonesFromText('Office: (555) 111-2222 Mobile: 0336 1623665');
        expect(phones.length).toBeGreaterThanOrEqual(2);
    });

    it('keeps extractPhoneFromText compatible', () => {
        expect(extractPhoneFromText('Phone: 0336 1623665')).toBe('0336 1623665');
    });
});

describe('extractAllPhonesFromHtml', () => {
    it('extracts tel links and json-ld telephone', () => {
        const html = `
            <a href="tel:+1-555-123-4567">Call</a>
            <script type="application/ld+json">{"telephone":"+44 20 7946 0958"}</script>
        `;
        const phones = extractAllPhonesFromHtml(html);
        expect(phones.some((p) => p.includes('555'))).toBe(true);
        expect(phones.some((p) => p.includes('7946'))).toBe(true);
    });

    it('extracts whatsapp links', () => {
        const html = '<a href="https://wa.me/923361623665">WhatsApp</a>';
        expect(extractAllPhonesFromHtml(html)[0]).toContain('923361623665');
    });
});

describe('website url helpers', () => {
    it('normalizes bare domains', () => {
        expect(normalizeWebsiteUrl('example.com')).toBe('https://example.com');
    });

    it('skips social profile urls', () => {
        expect(normalizeWebsiteUrl('https://www.linkedin.com/in/jane')).toBeNull();
    });

    it('builds website url from company domain', () => {
        expect(domainToWebsiteUrl('acme.com')).toBe('https://acme.com');
    });
});
