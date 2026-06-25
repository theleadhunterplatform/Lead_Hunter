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
        "We're Hiring – Freelance Flutter Developer. Remote freelance project.",
        'I am looking for an experienced freelance developer to build a fintech application.',
        "We're Looking for the Right Tech Partner! Looking for technology partners for our food delivery platform.",
        'Looking for a technical co-founder or developer to build our AI-powered app.',
        'Looking for Web Development agency and CRM Development partner. Estimated Project Value: 8 Lakh',
        'Looking for a Social Media Growth Partner. Seeking an agency to manage our social media.',
        'Looking for a Strong Technical Partner (Remote). Open to Development Agencies.',
        'Looking for Website & Mobile App Development Companies for enterprise project.',
        'Freelance Full-Stack Web Developer Needed. Project-based freelance developer.',
    ];

    const irrelevantExamples = [
        'We are hiring a full-time Shopify Engineer. Join our growing team!',
        'Open position: Senior Developer. Apply now. Benefits package included.',
        'Thrilled to announce our product launch today!',
        'Excited to share that I just joined Google as a PM',
        '5 career advice tips for junior developers',
        'Looking for web developer agency? Hire our verified freelancers ready to deliver!',
        'Available for freelance AI agent projects — DM me for details',
        'Hello I LOVE U ❤️',
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
