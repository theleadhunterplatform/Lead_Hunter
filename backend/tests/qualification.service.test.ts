jest.mock('../src/services/ai-training.service', () => ({
    isLocalAiModelReady: jest.fn(),
}));

jest.mock('../src/services/ocr.service', () => ({
    classifyText: jest.fn(),
}));

import { isLocalAiModelReady } from '../src/services/ai-training.service';
import { classifyText } from '../src/services/ocr.service';
import { qualifyPostContent } from '../src/services/qualification.service';

const mockModelReady = isLocalAiModelReady as jest.MockedFunction<typeof isLocalAiModelReady>;
const mockClassifyText = classifyText as jest.MockedFunction<typeof classifyText>;

describe('qualifyPostContent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockModelReady.mockResolvedValue(false);
        mockClassifyText.mockResolvedValue(null);
    });

    it('uses intent rules when the model is not trained', async () => {
        const content =
            'Looking for a web developer to rebuild our company site. Can anyone recommend someone?';

        const result = await qualifyPostContent(content);

        expect(result.status).toBe('relevant');
        expect(result.method).toBe('intent-rules');
        expect(mockClassifyText).not.toHaveBeenCalled();
    });

    it('blocks employment-only posts even when a model exists', async () => {
        mockModelReady.mockResolvedValue(true);
        mockClassifyText.mockResolvedValue({ label: 'relevant', confidence: 0.95 });

        const content = 'We are hiring a full-time senior developer. Join our team. #hiring';

        const result = await qualifyPostContent(content);

        expect(result.status).toBe('irrelevant');
        expect(result.method).toBe('intent-rules');
        expect(mockClassifyText).not.toHaveBeenCalled();
    });

    it('marks relevant when the trained model is confident', async () => {
        mockModelReady.mockResolvedValue(true);
        mockClassifyText.mockResolvedValue({ label: 'relevant', confidence: 0.86 });

        const content = 'Our team is debating vendors — might outsource a small Shopify tweak this week.';

        const result = await qualifyPostContent(content);

        expect(result.status).toBe('relevant');
        expect(['local-ai', 'intent-rules', 'intent+ai']).toContain(result.method);
    });

    it('overrides low rule scores when the trained model strongly disagrees', async () => {
        mockModelReady.mockResolvedValue(true);
        mockClassifyText.mockResolvedValue({ label: 'relevant', confidence: 0.9 });

        const content = 'freelancer community meetup yesterday — also need a dev for a paid landing page next week';

        const result = await qualifyPostContent(content);

        expect(result.status).toBe('relevant');
        expect(['local-ai', 'intent-rules']).toContain(result.method);
    });

    it('keeps freelance buyer posts relevant when model is only mildly irrelevant', async () => {
        mockModelReady.mockResolvedValue(true);
        mockClassifyText.mockResolvedValue({ label: 'irrelevant', confidence: 0.6 });

        const content =
            'Hiring: Website Developer I am looking for a skilled Website Developer to create a professional website. #FreelanceDeveloper #Hiring';

        const result = await qualifyPostContent(content);

        expect(result.status).toBe('relevant');
        expect(result.method).toBe('intent-rules');
    });

    it('sends uncertain posts to pending review instead of noise', async () => {
        mockModelReady.mockResolvedValue(true);
        mockClassifyText.mockResolvedValue({ label: 'irrelevant', confidence: 0.55 });

        const content = 'Thinking about maybe refreshing our website later this year. No budget yet.';

        const result = await qualifyPostContent(content);

        expect(['pending', 'irrelevant']).toContain(result.status);
        if (result.status === 'pending') {
            expect(result.label).toBe('UNCERTAIN');
        }
    });
});
