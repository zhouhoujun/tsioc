import { readWorkflowProperty } from '../../workflow-typed-value';
import { registerWorkflowNodeHandlers } from '../workflow-node-handlers';
import {
    evaluateConditionAsync,
    matchRouterRule,
    resolveCompareValueAsync,
    resolveWorkflowValue
} from '../values';

const resolveFrom = readWorkflowProperty;

/** Routing and branch-control nodes. */
registerWorkflowNodeHandlers({
    switch: async ({ node, context }) => {
        const config = node.config || {};
                    const actual = resolveWorkflowValue(config.field, context);
                    const rules = Array.isArray(config.rules) ? config.rules : [];
                    const checkAll = config.checkAll === true;
                    const routes: number[] = [];
                    let matchedAny = false;
                    for (let index = 0; index < rules.length; index++) {
                        const operator = String(rules[index]?.operator || 'equals');
                        const matched = operator === 'else'
                            ? !matchedAny
                            : matchRouterRule(actual, operator, await resolveCompareValueAsync(rules[index]?.value, context));
                        if (!matched) {
                            continue;
                        }
                        matchedAny = true;
                        if (!checkAll) {
                            return {
                                success: true,
                                data: { nodeId: node.id, route: index + 1, value: actual },
                                status: {
                                    text: `Route ${index + 1}`,
                                    level: 'info',
                                    key: 'workflow.nodeStatus.route',
                                    params: { route: index + 1 }
                                }
                            };
                        }
                        routes.push(index + 1);
                    }
                    if (checkAll) {
                        return {
                            success: true,
                            data: { nodeId: node.id, routes, route: routes[0] || 0, value: actual },
                            status: routes.length
                                ? {
                                    text: `Routes ${routes.join(', ')}`,
                                    level: 'info',
                                    key: 'workflow.nodeStatus.routes',
                                    params: { routes: routes.join(', ') }
                                }
                                : {
                                    text: 'No rule matched',
                                    level: 'warn',
                                    key: 'workflow.nodeStatus.noRule'
                                }
                        };
                    }
                    return {
                        success: true,
                        data: { nodeId: node.id, route: 0, value: actual },
                        status: { text: 'No rule matched', level: 'warn', key: 'workflow.nodeStatus.noRule' }
                    };
    },
    router: async ({ node, context }) => {
        const config = node.config || {};
                    const actual = resolveWorkflowValue(config.field, context);
                    const rules = Array.isArray(config.rules) ? config.rules : [];
                    const checkAll = config.checkAll === true;
                    const routes: number[] = [];
                    let matchedAny = false;
                    for (let index = 0; index < rules.length; index++) {
                        const operator = String(rules[index]?.operator || 'equals');
                        const matched = operator === 'else'
                            ? !matchedAny
                            : matchRouterRule(actual, operator, await resolveCompareValueAsync(rules[index]?.value, context));
                        if (!matched) {
                            continue;
                        }
                        matchedAny = true;
                        if (!checkAll) {
                            return {
                                success: true,
                                data: { nodeId: node.id, route: index + 1, value: actual },
                                status: {
                                    text: `Route ${index + 1}`,
                                    level: 'info',
                                    key: 'workflow.nodeStatus.route',
                                    params: { route: index + 1 }
                                }
                            };
                        }
                        routes.push(index + 1);
                    }
                    if (checkAll) {
                        return {
                            success: true,
                            data: { nodeId: node.id, routes, route: routes[0] || 0, value: actual },
                            status: routes.length
                                ? {
                                    text: `Routes ${routes.join(', ')}`,
                                    level: 'info',
                                    key: 'workflow.nodeStatus.routes',
                                    params: { routes: routes.join(', ') }
                                }
                                : {
                                    text: 'No rule matched',
                                    level: 'warn',
                                    key: 'workflow.nodeStatus.noRule'
                                }
                        };
                    }
                    return {
                        success: true,
                        data: { nodeId: node.id, route: 0, value: actual },
                        status: { text: 'No rule matched', level: 'warn', key: 'workflow.nodeStatus.noRule' }
                    };
    },
    condition: async ({ node, context }) => ({
        success: true,
        data: { nodeId: node.id, condition: await evaluateConditionAsync(node, context) }
    }),
    link: ({ node }) => {
        const config = node.config || {};
        return {
            success: true,
            data: {
                nodeId: node.id,
                mode: String(config.mode || 'out'),
                links: String(config.links || '').split(',').map(item => item.trim()).filter(Boolean),
                timeout: Math.max(0, Number(config.timeout) || 0)
            }
        };
    },
    join: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const incoming = extras?.incoming || [];
                    const ignoreEmpty = config.ignoreEmpty !== false;
                    const values = incoming
                        .filter(input => !ignoreEmpty || (input.result?.data !== undefined && input.result?.data !== null))
                        .map(input => input.result?.data);
                    const target = String(config.resultField || 'joined');
                    const mode = String(config.mode || 'array');
                    let value: any;
                    if (mode === 'string') {
                        const joiner = String(config.joiner ?? ' ');
                        value = values
                            .map(item => item && typeof item === 'object' ? JSON.stringify(item) : String(item ?? ''))
                            .join(joiner);
                    } else if (mode === 'count') {
                        value = values.slice(0, Math.max(1, Number(config.count) || 1));
                    } else if (mode === 'timeout') {
                        value = values;
                    } else if (mode === 'merge') {
                        value = values.reduce((merged: Record<string, any>, item) =>
                            item && typeof item === 'object' && !Array.isArray(item)
                                ? { ...merged, ...item }
                                : merged, {});
                    } else if (mode === 'key') {
                        const keyPath = String(config.keyField || 'key');
                        const valuePath = String(config.valueField || '').trim();
                        const keyed: Record<string, any> = {};
                        values.forEach(item => {
                            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                                return;
                            }
                            const key = resolveFrom(item, keyPath);
                            if (key === undefined || key === null || key === '') {
                                return;
                            }
                            keyed[String(key)] = valuePath ? resolveFrom(item, valuePath) : item;
                        });
                        value = keyed;
                    } else {
                        value = values;
                    }
                    return {
                        success: true,
                        data: {
                            nodeId: node.id,
                            joined: true,
                            branches: Array.isArray(value) ? value.length : values.length,
                            totalBranches: incoming.length,
                            results: values,
                            [target]: value
                        }
                    };
    }
});
