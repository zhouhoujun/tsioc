/**
 * Completion names offered by the expression editor: the scope handles the
 * evaluator provides plus the JSONata functions users reach for most.
 */
export const WORKFLOW_EXPRESSION_SUGGESTIONS: string[] = [
    'payload',
    'msg',
    'flow',
    'global',
    'env',
    '$sum',
    '$count',
    '$max',
    '$min',
    '$average',
    '$round',
    '$floor',
    '$ceil',
    '$abs',
    '$string',
    '$number',
    '$boolean',
    '$exists',
    '$now',
    '$uppercase',
    '$lowercase',
    '$trim',
    '$length',
    '$substring',
    '$split',
    '$join',
    '$map',
    '$filter',
    '$reduce',
    '$sort',
    '$distinct',
    '$merge',
    '$keys',
    '$lookup',
    '$append',
    '$formatNumber',
    '$formatBase',
    '$base64encode',
    '$base64decode',
    '$encodeUrlComponent',
    '$decodeUrlComponent'
];

/**
 * Completion paths observed in the last run. The expression scope exposes
 * message payload fields at the root (plus `msg`/`payload`), flow/global
 * variables and node results, so the editor can complete against real data
 * shapes instead of only the static scope names.
 */
export function workflowExpressionScopeSuggestions(
    designer?: { execution?: { nodeStates?: Record<string, any> } }
): string[] {
    const values = new Set<string>();
    const walkInto = (root: any, prefix: string): void => {
        const seen = new Set<any>();
        const walk = (value: any, pathPrefix: string, depth: number): void => {
            if (depth > 3 || !value || typeof value !== 'object' || Array.isArray(value) || seen.has(value)) {
                return;
            }
            seen.add(value);
            Object.keys(value).slice(0, 80).forEach(key => {
                const path = pathPrefix ? `${pathPrefix}.${key}` : key;
                // Identifier-safe paths only keep the completion list useful.
                if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(path)) {
                    values.add(path);
                }
                walk(value[key], path, depth + 1);
            });
        };
        walk(root, prefix, 0);
    };
    const states = designer?.execution?.nodeStates || {};
    Object.keys(states).forEach(nodeId => {
        const data = states[nodeId]?.result?.data;
        if (!data || typeof data !== 'object') {
            return;
        }
        // Payload fields sit at the expression root and under `payload`/`msg`.
        walkInto(data.payload, '');
        walkInto(data.payload, 'payload');
        walkInto(data.msg, 'msg');
        walkInto(data.variables, 'variables');
        walkInto(data.subprocess, 'subprocess');
    });
    return Array.from(values).sort().slice(0, 400);
}
