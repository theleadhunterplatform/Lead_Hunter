import {
    classifyLeadIntent,
    confidenceToLabel,
} from '../src/utils/lead-intent-scoring.utils';

describe('lead-intent-scoring', () => {
    const relevantExamples = [
        'Looking for a Shopify developer to rebuild our store',
        'Can anyone recommend a website designer for our startup?',
        'Need help redesigning our website — open to agencies',
        'Seeking an SEO agency for a 3-month project',
        'Looking for a videography partner for product shoots',
        'Need a UI/UX designer for a startup project',
        'Looking for an app development company to build our MVP',
    ];

    const irrelevantExamples = [
        'We are hiring a full-time Shopify Engineer. Join our growing team!',
        'Open position: Senior Developer. Apply now. Benefits package included.',
        'Thrilled to announce our product launch today!',
        'Excited to share that I just joined Google as a PM',
        '5 career advice tips for junior developers',
    ];

    it.each(relevantExamples)('classifies buying intent as RELEVANT: %s', (text) => {
        const result = classifyLeadIntent(text);
        expect(confidenceToLabel(result.confidence)).toBe('RELEVANT');
        expect(result.confidence).toBeGreaterThanOrEqual(71);
    });

    it.each(irrelevantExamples)('classifies employment/content as IRRELEVANT: %s', (text) => {
        const result = classifyLeadIntent(text);
        expect(confidenceToLabel(result.confidence)).toBe('IRRELEVANT');
        expect(result.confidence).toBeLessThanOrEqual(40);
    });

    it('flags full-time hiring without buying signals', () => {
        const result = classifyLeadIntent('We are hiring a full-time developer. Salary range $120k.');
        expect(result.analysis.employment.length + result.analysis.fullTime.length).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(40);
    });

    it('returns reasons array', () => {
        const result = classifyLeadIntent('Can anyone recommend a good SEO agency?');
        expect(result.reasons.length).toBeGreaterThan(0);
        expect(result.analysis.recommendation.length).toBeGreaterThan(0);
    });
});
