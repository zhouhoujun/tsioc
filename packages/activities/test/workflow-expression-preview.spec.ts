import expect = require('expect');
import { buildWorkflowExpressionPreviewScope } from '../src/visual/workflow-expression-preview';

describe('Workflow expression preview scope', () => {
    it('merges the last run payload, message and variables', () => {
        const { scope, samples } = buildWorkflowExpressionPreviewScope({
            execution: {
                nodeStates: {
                    inject_1: {
                        result: { data: { payload: { total: 21 }, variables: { orderId: 'o1' } } }
                    },
                    change_1: {
                        result: {
                            data: {
                                payload: { total: 42, customer: { name: 'Ada' } },
                                msg: { topic: 'orders', payload: { total: 42 } }
                            }
                        }
                    }
                }
            }
        } as any);
        expect(samples).toBe(2);
        expect(scope.payload).toEqual({ total: 42, customer: { name: 'Ada' } });
        expect(scope.total).toBe(42);
        expect(scope.customer.name).toBe('Ada');
        expect(scope.msg.topic).toBe('orders');
        expect(scope.variables.orderId).toBe('o1');
        expect(scope.flow).toEqual({});
        expect(scope.global).toEqual({});
    });

    it('includes the service global context but keeps flow/env empty', () => {
        const { scope } = buildWorkflowExpressionPreviewScope({
            service: { getGlobalContext: () => ({ region: 'eu', limit: 3 }) }
        });
        expect(scope.global).toEqual({ region: 'eu', limit: 3 });
        expect(scope.flow).toEqual({});
        expect(scope.env).toEqual({});
    });

    it('returns an empty scope when no run has completed', () => {
        const empty = buildWorkflowExpressionPreviewScope();
        expect(empty.samples).toBe(0);
        expect(empty.scope.payload).toEqual({});
    });
});
