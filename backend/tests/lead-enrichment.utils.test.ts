import {
    extractPhoneFromText,
    isOpaqueLinkedInPublicId,
    resolveLinkedInPublicId,
    resolveLinkedInPublicIdFromLead,
} from '../src/utils/lead-enrichment.utils';

describe('extractPhoneFromText', () => {
    it('extracts local mobile as written in post', () => {
        expect(extractPhoneFromText('Contact mudassar3616@gmail.com 0336162365')).toBe('0336162365');
    });

    it('extracts compound contact labels', () => {
        expect(extractPhoneFromText('Phone/No/Mobile No/Contact: 0336 1623665')).toBe('0336 1623665');
    });

    it('extracts labeled phone variants', () => {
        expect(extractPhoneFromText('Phone: 0336 1623665')).toBe('0336 1623665');
        expect(extractPhoneFromText('Mobile No: 0336162365')).toBe('0336162365');
        expect(extractPhoneFromText('Contact - +92 336 1623665')).toBe('+92 336 1623665');
    });

    it('extracts international format as written', () => {
        expect(extractPhoneFromText('+92 336 1623665')).toBe('+92 336 1623665');
    });

    it('extracts US-style numbers', () => {
        expect(extractPhoneFromText('Reach me at (555) 123-4567')).toBe('(555) 123-4567');
    });

    it('returns null for too-short digit runs', () => {
        expect(extractPhoneFromText('room 1234')).toBeNull();
    });
});

describe('resolveLinkedInPublicId', () => {
    it('prefers vanity publicIdentifier over opaque URL slug', () => {
        expect(
            resolveLinkedInPublicId({
                author: {
                    publicIdentifier: 'nickbennett05',
                    url: 'https://www.linkedin.com/in/ACoAAAMs-kQBF8xYdTGLvYN4zwhqDGh2UlSXIpY',
                },
            })
        ).toBe('nickbennett05');
    });

    it('falls back to opaque slug when no vanity id exists', () => {
        const opaque = 'ACoAAAMs-kQBF8xYdTGLvYN4zwhqDGh2UlSXIpY';
        expect(
            resolveLinkedInPublicId({
                author: { url: `https://www.linkedin.com/in/${opaque}` },
            })
        ).toBe(opaque);
    });

    it('resolves from lead author.publicIdentifier', () => {
        expect(
            resolveLinkedInPublicIdFromLead({
                author: {
                    publicIdentifier: 'jane-doe',
                    url: 'https://www.linkedin.com/in/ACoOpaqueId123',
                },
                url: 'https://www.linkedin.com/posts/jane-doe_activity-123',
            })
        ).toBe('jane-doe');
    });

    it('backfills publicIdentifier from raw_result for older leads', () => {
        expect(
            resolveLinkedInPublicIdFromLead({
                author: { url: 'https://www.linkedin.com/in/ACoOpaqueId123' },
                raw_result: { author: { publicIdentifier: 'saved-in-raw' } },
            })
        ).toBe('saved-in-raw');
    });
});

describe('isOpaqueLinkedInPublicId', () => {
    it('detects internal LinkedIn ids', () => {
        expect(isOpaqueLinkedInPublicId('ACoAAAMs-kQBF8xYdTGLvYN4zwhqDGh2UlSXIpY')).toBe(true);
        expect(isOpaqueLinkedInPublicId('nickbennett05')).toBe(false);
    });
});
