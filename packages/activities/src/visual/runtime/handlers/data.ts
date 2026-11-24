import { evaluateWorkflowExpression } from '../../workflow-expression';
import { readWorkflowProperty, resolveWorkflowMarkersAsync } from '../../workflow-typed-value';
import { registerWorkflowNodeHandlers } from '../workflow-node-handlers';
import {
    arrayFrom,
    changeContextValue,
    coerceJson,
    compareValues,
    resolveCompareValueAsync,
    resolveWorkflowValue
} from '../values';

const resolveFrom = readWorkflowProperty;

/** Data/sequence nodes: arrays, comparisons, aggregation and context edits. */
registerWorkflowNodeHandlers({
    change: async ({ node, context, extras }) => {
        const config = node.config || {};
                    try {
                        const rules = Array.isArray(config.rules) && config.rules.length
                            ? config.rules
                            : [{ action: config.action, field: config.field, value: config.value }];
                        const applied: string[] = [];
                        for (const rule of rules) {
                            if (!rule?.field) {
                                continue;
                            }
                            const action = String(rule.action || 'set');
                            if (action === 'move') {
                                const target = String(rule.to || '').trim();
                                if (!target) {
                                    throw new Error('Change move needs a target field.');
                                }
                                const current = resolveWorkflowValue(rule.field, context);
                                changeContextValue(context, rule.field, 'delete', undefined);
                                changeContextValue(context, target, 'set', current);
                                applied.push(rule.field);
                                continue;
                            }
                            if (action === 'replace') {
                                const search = String(rule.search ?? '');
                                const current = resolveWorkflowValue(rule.field, context);
                                if (!search) {
                                    applied.push(rule.field);
                                    continue;
                                }
                                const replacement = String(rule.replace ?? '');
                                const next = Array.isArray(current)
                                    ? current.map(item => String(item).split(search).join(replacement))
                                    : String(current ?? '').split(search).join(replacement);
                                changeContextValue(context, rule.field, 'set', next);
                                applied.push(rule.field);
                                continue;
                            }
                            // Mutate the context in place so later rules keep operating
                            // on the whole message instead of the previous value.
                            const valueFrom = String(rule.valueFrom || 'literal');
                            const valuePath = String(rule.valuePath || '').trim();
                            let ruleValue: any;
                            if (valueFrom === 'expression') {
                                ruleValue = await evaluateWorkflowExpression(String(rule.valueExpression ?? ''), context);
                            } else if (valueFrom === 'msg') {
                                ruleValue = resolveFrom((context as any).msg || { payload: (context as any).payload }, valuePath);
                            } else if (valueFrom === 'flow') {
                                ruleValue = resolveFrom((context as any).flow || {}, valuePath);
                            } else if (valueFrom === 'global') {
                                ruleValue = resolveFrom((context as any).global || {}, valuePath);
                            } else if (valueFrom === 'env') {
                                ruleValue = resolveFrom((context as any).env || {}, valuePath);
                            } else {
                                ruleValue = coerceJson(rule.value);
                            }
                            changeContextValue(context, rule.field, action, ruleValue);
                            applied.push(rule.field);
                        }
                        return {
                            success: true,
                            data: {
                                nodeId: node.id,
                                field: rules[0]?.field,
                                value: context,
                                changed: applied.length > 0,
                                rules: applied
                            }
                        };
                    } catch (error) {
                        return { success: false, error: error as Error, data: { nodeId: node.id } };
                    }
    },
    statistics: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const items = arrayFrom(context, config.field);
                    const values = items.map(item => resolveFrom(item, config.path)).filter(value => value !== undefined && value !== null);
                    const numbers = values.map(Number).filter(value => Number.isFinite(value));
                    const operation = String(config.operation || 'count');
                    let value: any = values.length;
                    if (operation === 'sum') {
                        value = numbers.reduce((sum, item) => sum + item, 0);
                    } else if (operation === 'avg') {
                        value = numbers.length ? numbers.reduce((sum, item) => sum + item, 0) / numbers.length : 0;
                    } else if (operation === 'min') {
                        value = numbers.length ? Math.min(...numbers) : 0;
                    } else if (operation === 'max') {
                        value = numbers.length ? Math.max(...numbers) : 0;
                    }
                    const resultField = String(config.resultField || 'value');
                    return {
                        success: true,
                        data: { nodeId: node.id, [resultField]: value, value, count: items.length }
                    };
    },
    merge: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const fields = String(config.fields || '')
                        .split(',')
                        .map(field => field.trim())
                        .filter(Boolean);
                    const values = fields.map(field => resolveWorkflowValue(field, context));
                    const result = String(config.mode || 'object') === 'array'
                        ? values.reduce<any[]>((acc, item) => acc.concat(Array.isArray(item) ? item : [item]), [])
                        : Object.assign({}, ...values.filter(item => item && typeof item === 'object' && !Array.isArray(item)));
                    const resultField = String(config.resultField || 'value');
                    return { success: true, data: { nodeId: node.id, [resultField]: result, value: result } };
    },
    split: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const source = resolveWorkflowValue(config.field || 'items', context);
                    const items = Array.isArray(source)
                        ? source
                        : typeof source === 'string'
                            ? source.split(String(config.delimiter ?? ','))
                            : [];
                    return { success: true, data: { nodeId: node.id, items, count: items.length } };
    },
    map: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const items = arrayFrom(context, config.field);
                    const mapped = items.map(item => resolveFrom(item, config.path));
                    return { success: true, data: { nodeId: node.id, items: mapped, count: mapped.length } };
    },
    filter: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const items = arrayFrom(context, config.field);
                    const expected = await resolveCompareValueAsync(config.value, context);
                    const filtered = items.filter(item => {
                        const actual = resolveFrom(item, config.path);
                        return compareValues(actual, String(config.operator || 'truthy'), expected);
                    });
                    return { success: true, data: { nodeId: node.id, items: filtered, count: filtered.length } };
    },
    sort: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const items = arrayFrom(context, config.field).slice();
                    const keys = (Array.isArray(config.keys) ? config.keys : [])
                        .filter((key: any) => String(key?.path ?? '').trim());
                    const compareValues = (a: any, b: any): number => {
                        if (typeof a === 'number' && typeof b === 'number') {
                            return a - b;
                        }
                        return String(a ?? '').localeCompare(String(b ?? ''));
                    };
                    const compareKey = (a: any, b: any, key: any): number => {
                        const av = resolveFrom(a, key.path);
                        const bv = resolveFrom(b, key.path);
                        const direction = String(key.order || 'asc') === 'desc' ? -1 : 1;
                        if (key.numeric === true) {
                            const an = Number(av);
                            const bn = Number(bv);
                            return (Number.isFinite(an) && Number.isFinite(bn) ? an - bn : compareValues(av, bv)) * direction;
                        }
                        return compareValues(av, bv) * direction;
                    };
                    if (keys.length) {
                        // Multi-key ordering: later keys only break ties.
                        items.sort((a, b) => {
                            for (const key of keys) {
                                const result = compareKey(a, b, key);
                                if (result !== 0) {
                                    return result;
                                }
                            }
                            return 0;
                        });
                    } else {
                        const direction = String(config.order || 'asc') === 'desc' ? -1 : 1;
                        items.sort((a, b) => {
                            const av = resolveFrom(a, config.path);
                            const bv = resolveFrom(b, config.path);
                            if (config.numeric === true) {
                                const an = Number(av);
                                const bn = Number(bv);
                                return (Number.isFinite(an) && Number.isFinite(bn) ? an - bn : compareValues(av, bv)) * direction;
                            }
                            return compareValues(av, bv) * direction;
                        });
                    }
                    return { success: true, data: { nodeId: node.id, items, count: items.length } };
    },
    range: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const from = Number(config.from ?? 0);
                    const to = Number(config.to ?? 10);
                    const step = Math.max(1, Math.abs(Number(config.step ?? 1)) || 1);
                    const items: number[] = [];
                    for (let value = from; value < to; value += step) {
                        items.push(value);
                    }
                    return { success: true, data: { nodeId: node.id, items, count: items.length } };
    },
    combine: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const fields = String(config.fields || '').split(',').map(item => item.trim()).filter(Boolean);
                    if (!fields.length) {
                        return { success: false, error: new Error('Combine requires at least one field'), data: { nodeId: node.id } };
                    }
                    const values = fields.map(field => resolveWorkflowValue(field, context));
                    const mode = String(config.mode || 'merge');
                    let result: any;
                    if (mode === 'concat') {
                        result = values.reduce((acc: any[], value) => acc.concat(Array.isArray(value) ? value : [value]), []);
                    } else if (mode === 'text') {
                        const separator = String(config.separator ?? ', ');
                        result = values
                            .map(value => value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''))
                            .join(separator);
                    } else {
                        result = values.reduce((acc: Record<string, any>, value) =>
                            value && typeof value === 'object' && !Array.isArray(value)
                                ? { ...acc, ...value }
                                : acc, {});
                    }
                    const target = String(config.resultField || 'value');
                    return { success: true, data: { nodeId: node.id, [target]: result, value: result } };
    },
    rbe: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const items = arrayFrom(context, config.field);
                    const path = String(config.path || '').trim();
                    const wholeItem = String(config.mode || 'value') === 'change' || !path;
                    const filtered: any[] = [];
                    const ignoreFirst = config.ignoreFirst === true;
                    const deadband = Math.max(0, Number(config.deadband) || 0);
                    const mode = String(config.mode || 'value');
                    let previous: string | undefined;
                    let previousRaw: any;
                    let hasPrevious = false;
                    for (const item of items) {
                        const raw = wholeItem ? item : resolveFrom(item, path);
                        const key = JSON.stringify(raw);
                        if (!hasPrevious) {
                            previous = key;
                            previousRaw = raw;
                            hasPrevious = true;
                            if (!ignoreFirst) {
                                filtered.push(item);
                            }
                            continue;
                        }
                        let changed: boolean;
                        if (mode === 'deadband' && Number.isFinite(Number(raw)) && Number.isFinite(Number(previousRaw))) {
                            changed = Math.abs(Number(raw) - Number(previousRaw)) > deadband;
                        } else {
                            changed = key !== previous;
                        }
                        if (changed) {
                            filtered.push(item);
                            previous = key;
                            previousRaw = raw;
                        }
                    }
                    return { success: true, data: { nodeId: node.id, items: filtered, count: filtered.length } };
    },
    batch: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const items = arrayFrom(context, config.field);
                    const size = Math.max(1, Number(config.size) || 10);
                    const overlap = Math.max(0, Math.min(size - 1, Number(config.overlap) || 0));
                    const step = Math.max(1, size - overlap);
                    const batches: any[][] = [];
                    for (let index = 0; index < items.length; index += step) {
                        if (overlap > 0 && items.length - index <= overlap) {
                            break;
                        }
                        batches.push(items.slice(index, index + size));
                    }
                    return { success: true, data: { nodeId: node.id, items: batches, count: batches.length } };
    },
    assign: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const values = await resolveWorkflowMarkersAsync(
                        coerceJson(config.values ?? config.data ?? {}),
                        context
                    );
                    const variables = { ...((context as any).variables || {}), ...(values && typeof values === 'object' ? values : {}) };
                    (context as any).variables = variables;
                    return { success: true, data: { nodeId: node.id, variables } };
    },
    transform: async ({ node, context, extras }) => {
        const config = node.config || {};
                    if (config.result !== undefined) {
                        return { success: true, data: { nodeId: node.id, result: coerceJson(config.result) } };
                    }
                    const mapping = coerceJson(config.mapping);
                    if (mapping && typeof mapping === 'object') {
                        const result: Record<string, any> = {};
                        Object.keys(mapping).forEach(key => {
                            result[key] = resolveWorkflowValue(mapping[key], context);
                        });
                        return { success: true, data: { nodeId: node.id, result } };
                    }
                    return { success: true, data: { nodeId: node.id, result: context } };
    },
    scale: async ({ node, context, extras }) => {
        const config = node.config || {};
                    const input = Number(resolveWorkflowValue(config.field || 'value', context));
                    if (!Number.isFinite(input)) {
                        return { success: false, error: new Error('Scale input is not a number'), data: { nodeId: node.id } };
                    }
                    const inMin = Number(config.inMin ?? 0);
                    const inMax = Number(config.inMax ?? 100);
                    const outMin = Number(config.outMin ?? 0);
                    const outMax = Number(config.outMax ?? 1);
                    const span = inMax - inMin;
                    let scaled = span === 0 ? outMin : outMin + ((input - inMin) / span) * (outMax - outMin);
                    const low = Math.min(outMin, outMax);
                    const high = Math.max(outMin, outMax);
                    // Legacy documents only have `clamp` (often merged with the new
                    // default action), so an explicit `clamp: false` still means scale.
                    const action = config.clamp === false && (!config.action || config.action === 'clamp')
                        ? 'scale'
                        : String(config.action || 'clamp');
                    if (action === 'drop' && (input < Math.min(inMin, inMax) || input > Math.max(inMin, inMax))) {
                        // Out of range stops the branch instead of forwarding a value.
                        return {
                            success: true,
                            data: { nodeId: node.id, dropped: true, value: input },
                            drop: true,
                            status: { text: 'Dropped (out of range)', level: 'warn', key: 'workflow.nodeStatus.dropped' }
                        };
                    }
                    if (action === 'clamp') {
                        scaled = Math.min(high, Math.max(low, scaled));
                    } else if (action === 'wrap' && high > low) {
                        const width = high - low;
                        scaled = low + (((scaled - low) % width) + width) % width;
                    }
                    if (config.round === true) {
                        scaled = Math.round(scaled);
                    }
                    const target = String(config.target || 'value');
                    return { success: true, data: { nodeId: node.id, [target]: scaled, value: scaled } };
    }
});
