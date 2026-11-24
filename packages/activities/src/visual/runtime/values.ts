import type { ActivityContext } from '../../activities/Activity';
import {
    isWorkflowValueRef,
    resolveWorkflowExpressionMarkers,
    resolveWorkflowTypedValue,
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
