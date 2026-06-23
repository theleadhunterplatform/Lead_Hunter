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

        const content = 'Need help with a small Shopify tweak for our store this week.';

        const result = await qualifyPostContent(content);

        expect(result.status).toBe('relevant');
        expect(result.method).toBe('local-ai');
    });

    it('overrides low rule scores when the trained model strongly disagrees', async () => {
        mockModelReady.mockResolvedValue(true);
        mockClassifyText.mockResolvedValue({ label: 'relevant', confidence: 0.9 });

        const content = 'Anyone know a good freelancer for a quick landing page project?';

        const result = await qualifyPostContent(content);

        expect(result.status).toBe('relevant');
        expect(result.method).toBe('local-ai');
    });
});
