import { shouldIngestScrapedPost } from '../src/utils/scraped-post-gate.utils';

describe('scraped-post-gate', () => {
    it('rejects unrelated social noise even if platform returned it', () => {
        expect(shouldIngestScrapedPost('Hello I LOVE U ❤️', 'looking for web developer', 'twitter').ok).toBe(
            false
        );
    });

    it('accepts linkedin buyer posts when search phrase is not verbatim in body', () => {
        const post =
            'Can anyone recommend a reliable freelancer to rebuild our company website? We have budget approved and need someone who can handle React and Node.';
        expect(shouldIngestScrapedPost(post, 'can anyone recommend a web developer', 'linkedin').ok).toBe(
            true
        );
    });

    it('rejects posts without the search phrase in the text', () => {
        expect(
            shouldIngestScrapedPost(
                'We build amazing websites for clients worldwide. Hire our team today for fast delivery.',
                'looking for web developer',
                'linkedin'
            ).ok
        ).toBe(false);
    });

    it('accepts clear buyer posts on linkedin', () => {
        const post =
            'We are looking for a web developer to rebuild our company website. Can anyone recommend an agency? Budget approved.';
        expect(shouldIngestScrapedPost(post, 'looking for web developer', 'linkedin').ok).toBe(true);
    });

    it('rejects job hiring posts', () => {
        const post =
            '#Hiring Now hiring a full-time web developer. Apply now with salary and benefits package included.';
        expect(shouldIngestScrapedPost(post, 'looking for web developer', 'linkedin').ok).toBe(false);
    });

    it('rejects seller pitches on threads unless strong buyer language', () => {
        const post =
            'Looking for web developer agency? Hire our verified freelancers ready to deliver your project fast.';
        expect(shouldIngestScrapedPost(post, 'looking for web developer', 'threads').ok).toBe(false);
    });

    it('rejects aspiring developer posts when keyword is bare', () => {
        const post =
            'Happy Sunday I pride myself on being an aspiring Web Developer, but lately I realised I have always been prone to multitasking instead of mastering my core stack.';
        expect(shouldIngestScrapedPost(post, 'web developer', 'linkedin').ok).toBe(false);
    });

    it('rejects build-in-public and developer humor posts', () => {
        const humor =
            'Coffee Driven Development. My code quality chart: 0 cups syntax errors, 6 cups microservices nobody asked for. #DeveloperHumor #CodingLife';
        const startup =
            'Exploring an Idea: Project Tutor. Not yet a startup. Built the landing page and gathering early feedback. Join the waitlist. #BuildInPublic #EdTech';
        expect(shouldIngestScrapedPost(humor, 'web developer', 'linkedin').ok).toBe(false);
        expect(shouldIngestScrapedPost(startup, 'web developer', 'linkedin').ok).toBe(false);
    });
});
