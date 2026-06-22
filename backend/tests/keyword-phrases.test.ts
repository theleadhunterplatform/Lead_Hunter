import { splitKeywordPhrases } from '../src/utils/keyword-phrases.utils';

describe('keyword-phrases', () => {
    it('splits pasted mega keyword block into separate phrases', () => {
        const block =
            'looking for web developer looking for app developer need someone to build a website can anyone recommend a web developer';
        const phrases = splitKeywordPhrases(block);
        expect(phrases.length).toBeGreaterThan(2);
        expect(phrases).toContain('looking for web developer');
        expect(phrases).toContain('need someone to build a website');
    });

    it('keeps single short keyword intact', () => {
        expect(splitKeywordPhrases('looking for shopify developer')).toEqual([
            'looking for shopify developer',
        ]);
    });
});
