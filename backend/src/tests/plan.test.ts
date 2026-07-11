import {
    getPlanDefinition,
    isPlanId,
    listPlanDefinitions,
} from '../utils/plan.utils';

describe('plan utils', () => {
    it('lists free, paid, enterprise plans', () => {
        const plans = listPlanDefinitions();
        expect(plans.map((p) => p.id).sort()).toEqual(['enterprise', 'free', 'paid']);
    });

    it('falls back unknown plan to free', () => {
        expect(getPlanDefinition('unknown').id).toBe('free');
        expect(getPlanDefinition(undefined).monthly_tokens).toBe(10);
    });

    it('validates plan ids', () => {
        expect(isPlanId('free')).toBe(true);
        expect(isPlanId('starter')).toBe(false);
    });

    it('paid plan has higher monthly tokens than free', () => {
        expect(getPlanDefinition('paid').monthly_tokens).toBeGreaterThan(
            getPlanDefinition('free').monthly_tokens
        );
    });
});
