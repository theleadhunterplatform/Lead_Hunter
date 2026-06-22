import { extractPhoneFromText } from '../src/utils/lead-enrichment.utils';

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
