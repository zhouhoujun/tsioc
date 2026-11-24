import expect = require('expect');
import { workflowExpressionScopeSuggestions } from '../src/visual/workflow-expression-suggestions';

describe('Workflow expression completion scope', () => {
    it('collects paths from the last run payload, msg and variables', () => {
        const values = workflowExpressionScopeSuggestions({
            execution: {
                nodeStates: {
                    inject_1: {
                        result: {
                            data: {
                                payload: {
                                    total: 21,
                                    customer: { name: 'Ada', tags: ['a'] }
                                },
                                msg: { payload: { total: 21 }, topic: 'orders' },
                                variables: { orderId: 'o1' }
                            }
                        }
                    }
                }
            }
        } as any);
        expect(values).toContain('total');
        expect(values).toContain('payload.total');
        expect(values).toContain('customer.name');
        expect(values).toContain('msg.payload.total');
        expect(values).toContain('variables.orderId');
        // Arrays stay a value path; their contents are not expanded.
        expect(values).not.toContain('customer.tags.0');
    });

    it('ignores empty or invalid runs', () => {
        expect(workflowExpressionScopeSuggestions()).toEqual([]);
        expect(workflowExpressionScopeSuggestions({ execution: { nodeStates: {} } })).toEqual([]);
    });
});
