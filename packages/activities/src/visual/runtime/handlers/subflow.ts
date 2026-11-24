import type { ActivityContext, ActivityResult } from '../../../activities/Activity';
import type { VisualWorkflowDefinition } from '../../types';
import type { VisualNodeRuntimeHost } from '../../workflow-runtime';
import { registerWorkflowNodeHandlers } from '../workflow-node-handlers';
import { pause } from '../timing';
import { coerceJson, resolveWorkflowValue } from '../values';
import { readWorkflowProperty as resolveFrom } from '../../workflow-typed-value';

async function resolveSubWorkflow(
    source: any,
    context: ActivityContext,
    host?: VisualNodeRuntimeHost
): Promise<VisualWorkflowDefinition | undefined> {
    let definition = resolveWorkflowValue(source, context);
    if (!definition) {
        definition = coerceJson(source);
    }
    if (typeof definition === 'string') {
        const key = definition;
        definition = (context as any).workflows?.[key] || (context as any)[key];
        if (!definition && host?.resolveDefinition) {
            definition = await host.resolveDefinition(key);
        }
    }
    return definition && typeof definition === 'object'
        ? definition as VisualWorkflowDefinition
        : undefined;
}

/** Repeated and nested workflow execution. */
registerWorkflowNodeHandlers({
    loop: async ({ node, context, host, extras }) => {
        const config = node.config || {};
    const iterations = Math.max(0, Math.min(10000, Number(config.iterations ?? 1) || 0));
    const definition = await resolveSubWorkflow(config.workflow, context, host);
    if (!definition || !host?.executeDefinition) {
        return {
            success: false,
            error: new Error('Loop requires a sub-workflow source'),
            data: { nodeId: node.id, iterations }
        };
    }
    const results: ActivityResult[] = [];
    for (let index = 0; index < iterations; index++) {
        if (index > 0 && Number(config.delay) > 0) {
            if (!(await pause(Number(config.delay), extras?.cancelled))) {
                return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id, iterations: index } };
            }
        }
        const child = await host.executeDefinition(definition as VisualWorkflowDefinition, context);
        results.push(child);
        if (!child.success) {
            return {
                success: false,
                error: child.error || new Error('Loop sub-workflow failed'),
                data: { nodeId: node.id, iterations: index + 1, results, count: results.length }
            };
        }
    }
    return { success: true, data: { nodeId: node.id, iterations, results, count: results.length } };
    },
    subprocess: async ({ node, context, host }) => {
        const config = node.config || {};
    const source = config.workflow;
    const definition = await resolveSubWorkflow(source, context, host);
    if (definition && host?.executeDefinition) {
        // `inputs`/`outputs` map subflow ports to context paths so the
        // parent chooses what the child sees and what comes back.
        const inputs = coerceJson(config.inputs) || {};
        const childContext: any = { ...context };
        Object.keys(inputs).forEach(key => {
            childContext[key] = resolveWorkflowValue(inputs[key], context);
        });
        const result = await host.executeDefinition(definition, childContext);
        const outputs = coerceJson(config.outputs) || {};
        const mapped: Record<string, any> = {};
        Object.keys(outputs).forEach(key => {
            const path = outputs[key];
            const value = resolveFrom(result.data, path);
            mapped[key] = value === undefined ? resolveFrom(result, path) : value;
        });
        const hasOutputs = Object.keys(mapped).length > 0;
        return {
            success: result.success,
            data: {
                nodeId: node.id,
                subprocess: result.data,
                ...(hasOutputs ? { msg: mapped, payload: mapped } : {})
            },
            error: result.error
        };
    }
    if (source === undefined || source === null || source === '') {
        return { success: true, data: { nodeId: node.id, skipped: true, reason: 'No sub workflow configured' } };
    }
    return {
        success: false,
        error: new Error(`Sub-workflow not found: ${String(source)}. Configure a workflow id, a context path, or inline definition.`),
        data: { nodeId: node.id }
    };
    }
});
