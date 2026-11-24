import type { ActivityContext } from '../../activities/Activity';
import type { IVisualWorkflowNode } from '../types';
import {
    isWorkflowValueRef,
    resolveWorkflowExpressionMarkers,
    resolveWorkflowTypedValue,
    resolveWorkflowTypedValueAsync,
    workflowExpressionMarkers
} from '../workflow-typed-value';
import { evaluateWorkflowExpression } from '../workflow-expression';

/**
 * Resolve `{{credential:name}}` / `credential:name` values through the host
 * credential resolver. Plain values stay untouched for backwards compatibility.
 */
export async function resolveCredentialValue(
    value: any,
    context: ActivityContext
): Promise<any> {
    const text = String(value ?? '').trim();
    const match = /^\{\{\s*credential:([^}]+?)\s*\}\}$/.exec(text)
        || /^credential:([A-Za-z0-9_.-]+)$/.exec(text);
    if (!match) {
        return value;
    }
    const name = match[1].trim();
    const resolver = (context as any).resolveCredential;
    if (typeof resolver !== 'function') {
        throw new Error(`Credential "${name}" is not available in this host. Configure a credential store.`);
    }
    const resolved = await resolver(name);
    if (resolved === undefined) {
        throw new Error(`Credential not found: ${name}`);
    }
    return resolved;
}

/**
 * Resolve a dotted path (`input.approved`, `$.input.approved`) against the
 * workflow context. Literals (quoted strings, numbers, booleans, null) are
 * returned as-is so node configs remain JSON friendly. Typed value references
 * (objects) resolve through {@link resolveWorkflowTypedValue}.
 */
export function resolveWorkflowValue(source: any, context: ActivityContext): any {
    if (typeof source === 'function') {
        return source(context);
    }
    if (source === undefined || source === null) {
        return source;
    }
    if (isWorkflowValueRef(source)) {
        return resolveWorkflowTypedValue(source, context);
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

/**
 * Resolve a field value asynchronously: `{{expr: ...}}` markers, expression
 * typed values and the usual literal/path resolution. URL/body/inject fields
 * use this so one value can be computed without changing the stored shape.
 */
export async function resolveWorkflowValueAsync(source: any, context: ActivityContext): Promise<any> {
    if (workflowExpressionMarkers(source).length) {
        return resolveWorkflowExpressionMarkers(String(source), context);
    }
    if (isWorkflowValueRef(source) && source.type === 'expression') {
        return evaluateWorkflowExpression(source.value, context);
    }
    return resolveWorkflowValue(source, context);
}

export function coerceJson(value: any): any {
    if (typeof value !== 'string') {
        return value;
    }
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

export function arrayFrom(context: ActivityContext, field: string | undefined): any[] {
    const value = field
        ? resolveWorkflowValue(field, context)
        : ((context as any).items ?? (context as any).value);
    return Array.isArray(value) ? value : [];
}

export function resolveCompareValue(value: any, context: ActivityContext): any {
    return resolveWorkflowTypedValue(value, context);
}

export async function resolveCompareValueAsync(value: any, context: ActivityContext): Promise<any> {
    return resolveWorkflowTypedValueAsync(value, context);
}

export function compareValues(actual: any, operator: string, expected: any): boolean {
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

export function pathParts(path: string | undefined): string[] {
    return String(path || '')
        .replace(/^\$\.?/, '')
        .split('.')
        .filter(Boolean);
}

export function changeContextValue(
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

export function matchRouterRule(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
        case 'equals':
            // eslint-disable-next-line eqeqeq
            return actual == expected;
        case 'not-equals':
            // eslint-disable-next-line eqeqeq
            return actual != expected;
        case 'contains':
            return Array.isArray(actual)
                ? actual.some(item => String(item) === String(expected))
                : String(actual ?? '').includes(String(expected ?? ''));
        case 'regex':
            try {
                return new RegExp(String(expected ?? '')).test(String(actual ?? ''));
            } catch {
                return false;
            }
        case 'gt':
            return Number(actual) > Number(expected);
        case 'gte':
            return Number(actual) >= Number(expected);
        case 'lt':
            return Number(actual) < Number(expected);
        case 'lte':
            return Number(actual) <= Number(expected);
        case 'truthy':
            return !!actual;
        case 'falsy':
            return !actual;
        case 'is-null':
            return actual === null || actual === undefined;
        case 'is-not-null':
            return actual !== null && actual !== undefined;
        case 'is-empty':
            return actual === null
                || actual === undefined
                || actual === ''
                || (Array.isArray(actual) && actual.length === 0)
                || (typeof actual === 'object' && !Array.isArray(actual) && Object.keys(actual).length === 0);
        case 'is-not-empty':
            return !(actual === null
                || actual === undefined
                || actual === ''
                || (Array.isArray(actual) && actual.length === 0)
                || (typeof actual === 'object' && !Array.isArray(actual) && Object.keys(actual).length === 0));
        default:
            return false;
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
        return compareValues(actual, String(config.operator || 'truthy'), resolveCompareValue(config.value, context));
    }
    return true;
}

/**
 * Async twin of {@link evaluateCondition}: compares against a value that may be
 * an expression (JSONata). The sync form stays for hosts that only use plain
 * values and for backwards compatibility.
 */
export async function evaluateConditionAsync(
    node: IVisualWorkflowNode | undefined,
    context: ActivityContext
): Promise<boolean> {
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
        const expected = await resolveCompareValueAsync(config.value, context);
        return compareValues(actual, String(config.operator || 'truthy'), expected);
    }
    return true;
}
