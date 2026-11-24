import expect = require('expect');
import { MAX_SUBFLOW_DEPTH, WORKFLOW_CHAIN, subflowChainError, workflowChain } from '../src/visual/runtime/subflow-chain';

describe('Workflow subflow chain guard', () => {
    it('reports direct and indirect cycles with the full chain', () => {
        const context: any = { [WORKFLOW_CHAIN]: ['parent', 'child'] };
        expect(workflowChain(context)).toEqual(['parent', 'child']);
        expect(subflowChainError(context, 'child')?.message)
            .toContain('parent → child → child');
        expect(subflowChainError(context, 'parent')?.message)
            .toContain('parent → child → parent');
        expect(subflowChainError(context, 'other')).toBeUndefined();
        expect(subflowChainError(context, '')).toBeUndefined();
    });

    it('stops non-cyclic nesting that exceeds the depth limit', () => {
        const context: any = {
            [WORKFLOW_CHAIN]: Array.from({ length: MAX_SUBFLOW_DEPTH }, (_value, index) => `w${index}`)
        };
        expect(subflowChainError(context, 'next')?.message).toContain(`limit ${MAX_SUBFLOW_DEPTH}`);
    });
});
