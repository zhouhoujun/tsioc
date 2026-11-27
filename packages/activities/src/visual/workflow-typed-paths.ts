import { collectTypedPaths } from '@tsdi/components/common/dynamic-form';

export type WorkflowTypedPaths = Record<string, string[]>;

const cache = new WeakMap<object, WorkflowTypedPaths>();

/**
 * Runtime-scope paths offered by typed-value completion.
 *
 * Roots are always present so `payload`/`topic`/`variables` complete before the
 * first run; the current run context contributes nested paths. Cached per
 * context identity because hosts replace `runContext` immutably.
 */
export function workflowTypedPaths(runContext: any): WorkflowTypedPaths {
    const context = (runContext || {}) as Record<string, any>;
    const cached = cache.get(context);
    if (cached) {
        return cached;
    }
    const values: WorkflowTypedPaths = {
        msg: collectTypedPaths(context.msg, [
            'payload', 'topic', 'meta', 'variables', 'actions', 'inbound',
            'error', 'status', 'complete'
        ]),
        flow: collectTypedPaths(context.flow, ['variables']),
        global: collectTypedPaths(context.global, []),
        env: collectTypedPaths(context.env, []),
        node: collectTypedPaths(context.node, [])
    };
    cache.set(context, values);
    return values;
}
