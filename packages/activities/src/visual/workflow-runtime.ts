import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import {
    IVisualWorkflowNode,
    NodeConnection,
    VisualWorkflowDefinition
} from './types';

export interface VisualNodeRuntimeHost {
    /**
     * Allow a subprocess node to execute another visual definition.
     */
    executeDefinition?(definition: VisualWorkflowDefinition, context: ActivityContext): Promise<ActivityResult>;
}

/**
 * Resolve a dotted path (`input.approved`, `$.input.approved`) against the
 * workflow context. Literals (quoted strings, numbers, booleans, null) are
 * returned as-is so node configs remain JSON friendly.
 */
export function resolveWorkflowValue(source: any, context: ActivityContext): any {
    if (typeof source === 'function') {
        return source(context);
    }
    if (source === undefined || source === null) {
        return source;
    }
    if (typeof source !== 'string') {
        return source;
    }
    const text = source.trim();
    if (!text) {
        return '';
    }
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
        return text.slice(1, -1);
    }
    if (text === 'true') return true;
    if (text === 'false') return false;
    if (text === 'null') return null;
    if (text === 'undefined') return undefined;
    if (/^-?\d+(\.\d+)?$/.test(text)) {
        return Number(text);
    }
    const path = text
        .replace(/^\$\.?/, '')
        .replace(/^context\./, '')
        .split('.')
        .filter(Boolean);
    let value: any = context;
    for (const key of path) {
        if (value === undefined || value === null) {
            return undefined;
        }
        value = value[key];
    }
    return value;
}

function compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
        case 'equals':
            // eslint-disable-next-line eqeqeq
            return actual == expected;
        case 'not-equals':
            // eslint-disable-next-line eqeqeq
            return actual != expected;
        case 'gt':
            return Number(actual) > Number(expected);
        case 'lt':
            return Number(actual) < Number(expected);
        case 'gte':
            return Number(actual) >= Number(expected);
        case 'lte':
            return Number(actual) <= Number(expected);
        case 'truthy':
        default:
            return Boolean(actual);
    }
}

/**
 * Evaluate a condition node using `config.condition`, `config.field` and
 * `config.operator`, or the `config.value` comparison value.
 */
export function evaluateCondition(node: IVisualWorkflowNode | undefined, context: ActivityContext): boolean {
    const config = node?.config || {};
    if (config.condition !== undefined) {
        if (typeof config.condition === 'function') {
            return Boolean(config.condition(context));
        }
        if (typeof config.condition === 'boolean') {
            return config.condition;
        }
        return Boolean(resolveWorkflowValue(config.condition, context));
    }
    if (config.field !== undefined) {
        const actual = resolveWorkflowValue(config.field, context);
        return compareValues(actual, String(config.operator || 'truthy'), config.value);
    }
    return true;
}

export function resolveSwitchValue(node: IVisualWorkflowNode | undefined, context: ActivityContext): any {
    const config = node?.config || {};
    if (config.field !== undefined) {
        return resolveWorkflowValue(config.field, context);
    }
    if (config.value !== undefined) {
        return resolveWorkflowValue(config.value, context);
    }
    return undefined;
}

function coerceJson(value: any): any {
    if (typeof value !== 'string') {
        return value;
    }
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function resolveFrom(value: any, path: string | undefined): any {
    if (!path) {
        return value;
    }
    const parts = String(path)
        .replace(/^\$\.?/, '')
        .split('.')
        .filter(Boolean);
    let current = value;
    for (const part of parts) {
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[part];
    }
    return current;
}

function arrayFrom(context: ActivityContext, field: string | undefined): any[] {
    const value = field
        ? resolveWorkflowValue(field, context)
        : ((context as any).items ?? (context as any).value);
    return Array.isArray(value) ? value : [];
}

function templateText(template: string, context: ActivityContext): string {
    return String(template ?? '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, key: string) =>
        String(resolveWorkflowValue(key, context) ?? '')
    );
}

function pathParts(path: string | undefined): string[] {
    return String(path || '')
        .replace(/^\$\.?/, '')
        .split('.')
        .filter(Boolean);
}

function changeContextValue(
    context: ActivityContext,
    path: string | undefined,
    action: string,
    value: any
): any {
    const parts = pathParts(path);
    if (!parts.length) {
        if (action === 'set' && value && typeof value === 'object') {
            Object.assign(context, value);
            return value;
        }
        return undefined;
    }
    let owner: any = context;
    for (let index = 0; index < parts.length - 1; index++) {
        const part = parts[index];
        if (owner[part] === undefined || owner[part] === null) {
            owner[part] = {};
        }
        owner = owner[part];
    }
    const key = parts[parts.length - 1];
    if (action === 'delete') {
        const current = owner[key];
        delete owner[key];
        return current;
    }
    if (action === 'append') {
        const current = owner[key];
        if (Array.isArray(current)) {
            current.push(value);
            return current;
        }
        owner[key] = current === undefined || current === null ? [value] : `${current}${value}`;
        return owner[key];
    }
    owner[key] = value;
    return value;
}

function parseCsv(text: string, delimiter: string, header: boolean): any {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    const source = String(text ?? '');
    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        if (quoted) {
            if (char === '"') {
                if (source[index + 1] === '"') {
                    cell += '"';
                    index++;
                } else {
                    quoted = false;
                }
            } else {
                cell += char;
            }
        } else if (char === '"') {
            quoted = true;
        } else if (char === delimiter) {
            row.push(cell);
            cell = '';
        } else if (char === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else if (char !== '\r') {
            cell += char;
        }
    }
    if (cell || row.length) {
        row.push(cell);
        rows.push(row);
    }
    if (!header || !rows.length) {
        return rows;
    }
    const keys = rows[0];
    return rows.slice(1).map(values => {
        const item: Record<string, string> = {};
        keys.forEach((key, index) => {
            item[key] = values[index] ?? '';
        });
        return item;
    });
}

function stringifyCsv(value: any, delimiter: string): string {
    const rows: any[][] = Array.isArray(value) ? value : [];
    if (!rows.length) {
        return '';
    }
    const escape = (cell: any) => {
        const text = cell === undefined || cell === null ? '' : String(cell);
        return /["\n\r]/.test(text) || text.includes(delimiter)
            ? `"${text.replace(/"/g, '""')}"`
            : text;
    };
    if (!Array.isArray(rows[0])) {
        const headers = Object.keys(rows[0] || {});
        return [
            headers.map(escape).join(delimiter),
            ...rows.map(row => headers.map(key => escape((row as any)?.[key])).join(delimiter))
        ].join('\n');
    }
    return rows.map(row => row.map(escape).join(delimiter)).join('\n');
}

function createActivity(node: IVisualWorkflowNode): Activity | undefined {
    const type = node.activityType;
    if (!type) {
        return undefined;
    }
    try {
        const activity = new (type as any)();
        Object.assign(activity, node.config || {});
        return activity as Activity;
    } catch {
        return undefined;
    }
}

async function runTask(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
    if (config.fail === true) {
        return {
            success: false,
            error: new Error(String(config.error || `Task "${node.name}" failed`)),
            data: { nodeId: node.id, failed: true }
        };
    }
    const action = config.action;
    const actions = (context as any).actions || {};
    if (typeof action === 'function') {
        return { success: true, data: { nodeId: node.id, result: await action(context) } };
    }
    if (typeof action === 'string' && action && typeof actions[action] === 'function') {
        return { success: true, data: { nodeId: node.id, result: await actions[action](context) } };
    }
    if (config.execute && typeof config.execute === 'function') {
        return { success: true, data: { nodeId: node.id, result: await config.execute(context) } };
    }
    if (config.result !== undefined) {
        const result = coerceJson(config.result);
        if (result && typeof result === 'object' && !Array.isArray(result)) {
            return { success: true, data: { ...result, nodeId: node.id } };
        }
        return { success: true, data: { nodeId: node.id, result } };
    }
    return { success: true, data: { nodeId: node.id, config } };
}

async function runHttp(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
    const url = resolveWorkflowValue(config.url, context);
    if (!url) {
        return {
            success: true,
            data: { nodeId: node.id, skipped: true, reason: 'No URL configured' }
        };
    }
    const fetchImpl = (globalThis as any).fetch;
    if (typeof fetchImpl !== 'function') {
        return {
            success: false,
            error: new Error('fetch is not available in this runtime'),
            data: { nodeId: node.id }
        };
    }
    try {
        const response = await fetchImpl(String(url), {
            method: String(config.method || 'GET').toUpperCase(),
            headers: coerceJson(config.headers) || undefined,
            body: config.body === undefined || config.body === '' ? undefined : String(config.body)
        });
        const text = await response.text();
        let body: any = text;
        try {
            body = text ? JSON.parse(text) : null;
        } catch {
            body = text;
        }
        return {
            success: response.ok,
            error: response.ok ? undefined : new Error(`HTTP ${response.status}`),
            data: { nodeId: node.id, status: response.status, body }
        };
    } catch (error) {
        return {
            success: false,
            error: error as Error,
            data: { nodeId: node.id }
        };
    }
}

/**
 * Execute one visual node. The runtime keeps node semantics platform-neutral so
 * the same definition runs from the browser editor, the terminal and a server.
 */
export async function executeVisualNode(
    node: IVisualWorkflowNode,
    context: ActivityContext,
    host?: VisualNodeRuntimeHost
): Promise<ActivityResult> {
    const config = node.config || {};

    const customActivity = createActivity(node);
    if (customActivity) {
        return customActivity.execute(context);
    }

    switch (node.type) {
        case 'start':
            return { success: true, data: { nodeId: node.id, started: true } };
        case 'end':
            return { success: true, data: { nodeId: node.id, completed: true } };
        case 'task':
            return runTask(node, context);
        case 'condition':
            return {
                success: true,
                data: { nodeId: node.id, condition: evaluateCondition(node, context) }
            };
        case 'switch':
            return {
                success: true,
                data: { nodeId: node.id, condition: resolveSwitchValue(node, context) }
            };
        case 'delay': {
            const delay = Math.max(0, Number(config.delay ?? config.duration ?? 0) || 0);
            await new Promise(resolve => setTimeout(resolve, delay));
            return { success: true, data: { nodeId: node.id, delayed: delay } };
        }
        case 'loop': {
            const iterations = Math.max(0, Math.min(10000, Number(config.iterations ?? 1) || 0));
            return { success: true, data: { nodeId: node.id, iterations } };
        }
        case 'log': {
            const level = String(config.level || 'info');
            const message = resolveWorkflowValue(config.message, context);
            const logger = (context as any).logger;
            if (logger && typeof logger[level] === 'function') {
                logger[level](message);
            }
            return { success: true, data: { nodeId: node.id, level, message } };
        }
        case 'http-request':
            return runHttp(node, context);
        case 'inject': {
            const payload = coerceJson(config.payload ?? {});
            if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
                return { success: true, data: { ...payload, nodeId: node.id } };
            }
            return { success: true, data: { nodeId: node.id, payload } };
        }
        case 'trigger': {
            const delay = Math.max(0, Number(config.delay) || 0);
            await new Promise(resolve => setTimeout(resolve, delay));
            const payload = coerceJson(config.payload ?? {});
            if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
                return { success: true, data: { ...payload, nodeId: node.id, triggered: true } };
            }
            return { success: true, data: { nodeId: node.id, triggered: true, payload } };
        }
        case 'function': {
            try {
                const source = String(config.code || 'return input;');
                // Trusted-code node: same trust level as a Node-RED function node.
                const fn = new Function(
                    'context',
                    'input',
                    'msg',
                    `"use strict"; return (async () => { ${source}\n })();`
                ) as (ctx: any, input: any, msg: any) => Promise<any>;
                const value = await fn(context, context, { ...context });
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    return { success: true, data: { ...value, nodeId: node.id } };
                }
                return { success: true, data: { nodeId: node.id, result: value } };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id } };
            }
        }
        case 'template': {
            const rendered = templateText(String(config.template ?? ''), context);
            const target = String(config.target || 'message');
            return { success: true, data: { nodeId: node.id, [target]: rendered, value: rendered } };
        }
        case 'json': {
            const source = resolveWorkflowValue(config.field || 'value', context);
            const mode = String(config.mode || 'parse');
            if (mode === 'stringify') {
                const json = JSON.stringify(source, null, config.pretty ? 2 : undefined);
                return { success: true, data: { nodeId: node.id, value: json, json } };
            }
            try {
                const value = typeof source === 'string' ? JSON.parse(source) : source;
                return {
                    success: true,
                    data: value && typeof value === 'object' && !Array.isArray(value)
                        ? { ...value, nodeId: node.id, value }
                        : { nodeId: node.id, value }
                };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id } };
            }
        }
        case 'csv': {
            const source = resolveWorkflowValue(config.field || 'value', context);
            const delimiter = String(config.delimiter ?? ',');
            try {
                if (String(config.mode || 'parse') === 'stringify') {
                    const value = stringifyCsv(source, delimiter);
                    return { success: true, data: { nodeId: node.id, value } };
                }
                const value = parseCsv(String(source ?? ''), delimiter, config.header !== false);
                return { success: true, data: { nodeId: node.id, value, items: value, count: value.length } };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id } };
            }
        }
        case 'change': {
            try {
                const value = coerceJson(config.value);
                const changed = changeContextValue(
                    context,
                    config.field,
                    String(config.action || 'set'),
                    value
                );
                return {
                    success: true,
                    data: { nodeId: node.id, field: config.field, value: changed, changed: true }
                };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id } };
            }
        }
        case 'statistics': {
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
        }
        case 'merge': {
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
        }
        case 'event-emit': {
            const event = String(config.event || 'workflow.event');
            const payload = coerceJson(config.payload);
            const bus = (context as any).eventBus || (context as any).events;
            if (bus && typeof bus.emit === 'function') {
                bus.emit(event, payload);
                return { success: true, data: { nodeId: node.id, event, emitted: true, payload } };
            }
            if (typeof (context as any).emit === 'function') {
                (context as any).emit(event, payload);
                return { success: true, data: { nodeId: node.id, event, emitted: true, payload } };
            }
            return { success: true, data: { nodeId: node.id, event, emitted: false, payload } };
        }
        case 'event-wait': {
            const event = String(config.event || 'workflow.event');
            const timeout = Math.max(0, Number(config.timeout) || 0);
            const bus = (context as any).eventBus || (context as any).events;
            try {
                if (bus && typeof bus.wait === 'function') {
                    const value = await bus.wait(event, timeout);
                    return { success: true, data: { nodeId: node.id, event, value, waited: true } };
                }
                if (typeof (context as any).waitEvent === 'function') {
                    const value = timeout
                        ? await Promise.race([
                            Promise.resolve((context as any).waitEvent(event)),
                            new Promise(resolve => setTimeout(() => resolve(undefined), timeout))
                        ])
                        : await (context as any).waitEvent(event);
                    return { success: true, data: { nodeId: node.id, event, value, waited: true } };
                }
                return { success: true, data: { nodeId: node.id, event, waited: false } };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id, event } };
            }
        }
        case 'command': {
            const command = String(config.command || '');
            const args = coerceJson(config.args);
            const executor = (context as any).exec
                || (context as any).runCommand
                || (context as any).commands?.[command];
            if (typeof executor === 'function') {
                try {
                    const result = await executor(command, args, context);
                    return {
                        success: true,
                        data: result && typeof result === 'object'
                            ? { ...result, nodeId: node.id, command }
                            : { nodeId: node.id, command, result }
                    };
                } catch (error) {
                    return { success: false, error: error as Error, data: { nodeId: node.id, command } };
                }
            }
            return { success: true, data: { nodeId: node.id, command, skipped: true, args } };
        }
        case 'split': {
            const source = resolveWorkflowValue(config.field || 'items', context);
            const items = Array.isArray(source)
                ? source
                : typeof source === 'string'
                    ? source.split(String(config.delimiter ?? ','))
                    : [];
            return { success: true, data: { nodeId: node.id, items, count: items.length } };
        }
        case 'map': {
            const items = arrayFrom(context, config.field);
            const mapped = items.map(item => resolveFrom(item, config.path));
            return { success: true, data: { nodeId: node.id, items: mapped, count: mapped.length } };
        }
        case 'filter': {
            const items = arrayFrom(context, config.field);
            const filtered = items.filter(item => {
                const actual = resolveFrom(item, config.path);
                return compareValues(actual, String(config.operator || 'truthy'), config.value);
            });
            return { success: true, data: { nodeId: node.id, items: filtered, count: filtered.length } };
        }
        case 'sort': {
            const items = arrayFrom(context, config.field).slice();
            const direction = String(config.order || 'asc') === 'desc' ? -1 : 1;
            items.sort((a, b) => {
                const av = resolveFrom(a, config.path);
                const bv = resolveFrom(b, config.path);
                if (typeof av === 'number' && typeof bv === 'number') {
                    return (av - bv) * direction;
                }
                return String(av ?? '').localeCompare(String(bv ?? '')) * direction;
            });
            return { success: true, data: { nodeId: node.id, items, count: items.length } };
        }
        case 'range': {
            const from = Number(config.from ?? 0);
            const to = Number(config.to ?? 10);
            const step = Math.max(1, Math.abs(Number(config.step ?? 1)) || 1);
            const items: number[] = [];
            for (let value = from; value < to; value += step) {
                items.push(value);
            }
            return { success: true, data: { nodeId: node.id, items, count: items.length } };
        }
        case 'batch': {
            const items = arrayFrom(context, config.field);
            const size = Math.max(1, Number(config.size) || 10);
            const batches: any[][] = [];
            for (let index = 0; index < items.length; index += size) {
                batches.push(items.slice(index, index + size));
            }
            return { success: true, data: { nodeId: node.id, items: batches, count: batches.length } };
        }
        case 'comment':
            return { success: true, data: { nodeId: node.id, comment: true } };
        case 'assign': {
            const values = coerceJson(config.values ?? config.data ?? {});
            const variables = { ...((context as any).variables || {}), ...(values && typeof values === 'object' ? values : {}) };
            (context as any).variables = variables;
            return { success: true, data: { nodeId: node.id, variables } };
        }
        case 'transform': {
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
        }
        case 'parallel':
            return { success: true, data: { nodeId: node.id, parallel: true } };
        case 'join':
            return { success: true, data: { nodeId: node.id, joined: true } };
        case 'trycatch':
            return { success: true, data: { nodeId: node.id, guarded: true } };
        case 'subprocess': {
            const definition = coerceJson(config.workflow);
            if (definition && host?.executeDefinition) {
                const result = await host.executeDefinition(definition as VisualWorkflowDefinition, context);
                return {
                    success: result.success,
                    data: { nodeId: node.id, subprocess: result.data },
                    error: result.error
                };
            }
            return { success: true, data: { nodeId: node.id, skipped: true, reason: 'No sub workflow configured' } };
        }
        case 'custom':
        default:
            if (config.execute && typeof config.execute === 'function') {
                return { success: true, data: { nodeId: node.id, result: await config.execute(context) } };
            }
            return {
                success: true,
                data: { nodeId: node.id, type: node.type, result: coerceJson(config.result) }
            };
    }
}

/**
 * Pure validation used by both the editor and the execution service.
 */
export function validateVisualWorkflow(definition: VisualWorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!definition?.id) {
        errors.push('Workflow ID is required');
    }
    if (!definition?.name) {
        errors.push('Workflow name is required');
    }
    if (!definition?.nodes || definition.nodes.length === 0) {
        errors.push('Workflow must have at least one node');
        return { valid: errors.length === 0, errors };
    }

    const nodeIds = new Set<string>();
    const duplicateIds: string[] = [];
    for (const node of definition.nodes) {
        if (!node.id) {
            errors.push('Every node requires an id');
        } else if (nodeIds.has(node.id)) {
            duplicateIds.push(node.id);
        }
        nodeIds.add(node.id);
    }
    if (duplicateIds.length) {
        errors.push(`Duplicate node IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
    }

    const startNodes = definition.nodes.filter(node => node.type === 'start');
    const injectNodes = definition.nodes.filter(node => node.type === 'inject');
    if (startNodes.length === 0 && injectNodes.length === 0) {
        errors.push('Workflow must have at least one start node');
    } else if (startNodes.length > 1) {
        errors.push('Workflow should have only one start node');
    }

    for (const connection of definition.connections || []) {
        if (!nodeIds.has(connection.sourceNodeId)) {
            errors.push(`Connection references non-existent source node: ${connection.sourceNodeId}`);
        }
        if (!nodeIds.has(connection.targetNodeId)) {
            errors.push(`Connection references non-existent target node: ${connection.targetNodeId}`);
        }
        if (connection.sourceNodeId === connection.targetNodeId) {
            errors.push(`Connection cannot link a node to itself: ${connection.sourceNodeId}`);
        }
    }

    if (hasCycle(definition)) {
        errors.push('Cycles detected in workflow');
    }

    return { valid: errors.length === 0, errors };
}

export function hasCycle(definition: VisualWorkflowDefinition): boolean {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const outgoing = new Map<string, string[]>();
    for (const node of definition.nodes || []) {
        outgoing.set(node.id, []);
    }
    for (const connection of definition.connections || []) {
        const list = outgoing.get(connection.sourceNodeId);
        if (list) {
            list.push(connection.targetNodeId);
        }
    }
    const visit = (id: string): boolean => {
        if (visiting.has(id)) {
            return true;
        }
        if (visited.has(id)) {
            return false;
        }
        visiting.add(id);
        for (const next of outgoing.get(id) || []) {
            if (visit(next)) {
                return true;
            }
        }
        visiting.delete(id);
        visited.add(id);
        return false;
    };
    for (const id of outgoing.keys()) {
        if (visit(id)) {
            return true;
        }
    }
    return false;
}

export function findWorkflowStartNode(definition: VisualWorkflowDefinition): IVisualWorkflowNode | undefined {
    const explicit = (definition.nodes || []).find(node => node.type === 'start');
    if (explicit) {
        return explicit;
    }
    const inject = (definition.nodes || []).find(node => node.type === 'inject');
    if (inject) {
        return inject;
    }
    return (definition.nodes || []).find(node =>
        !(definition.connections || []).some(connection => connection.targetNodeId === node.id)
    );
}

export function outgoingConnections(
    definition: VisualWorkflowDefinition,
    nodeId: string
): NodeConnection[] {
    return (definition.connections || []).filter(connection => connection.sourceNodeId === nodeId);
}
