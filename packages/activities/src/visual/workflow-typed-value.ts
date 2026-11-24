import type { DynamicFormTypedCodec } from '@tsdi/components/common/dynamic-form';
import type { ActivityContext } from '../activities/Activity';
import type { WorkflowValueRef } from './types';
import { evaluateWorkflowExpression, validateWorkflowExpression } from './workflow-expression';

/**
 * Literal classes a typed-value field may carry. `str` folds into the plain
 * `literal` source so documents written before literal types existed keep
 * their exact stored form.
 */
export type WorkflowLiteralType = 'str' | 'num' | 'bool' | 'json' | 're';

/** Sources offered by the typed-value selector. */
export type WorkflowTypedSource =
    | 'literal'
    | 'num'
    | 'bool'
    | 'json'
    | 're'
    | 'expression'
    | 'msg'
    | 'flow'
    | 'global'
    | 'env'
    | 'node';

/** Reference scopes a typed value may read from. */
const REFERENCE_TYPES = ['msg', 'flow', 'global', 'env', 'node'] as const;
const LITERAL_TYPES: WorkflowLiteralType[] = ['str', 'num', 'bool', 'json', 're'];

/**
 * Legacy stored form: `msg.payload`, `flow.count`, ... Prefixes stay readable
 * so older documents keep working without a migration step.
 */
const LEGACY_PREFIX = /^(msg|flow|global|env)\./;

/** A value reference object (`{ type, path }` / `{ type: 'literal', value }`). */
export function isWorkflowValueRef(value: any): value is WorkflowValueRef {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const type = String((value as any).type || '');
    return type === 'literal'
        || type === 'expression'
        || (REFERENCE_TYPES as readonly string[]).includes(type);
}

/**
 * A stored value that points at host context instead of carrying a literal.
 * Used by form validation so references skip literal-only rules.
 */
export function isWorkflowTypedReference(value: any): boolean {
    if (isWorkflowValueRef(value)) {
        return value.type !== 'literal';
    }
    return typeof value === 'string' && LEGACY_PREFIX.test(value);
}

/** Read a nested property (`.`/`$` paths) from a context scope. */
export function readWorkflowProperty(value: any, path: string | undefined): any {
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

/** Coerce a literal value to its declared class. */
export function coerceWorkflowLiteral(valueType: WorkflowLiteralType | undefined, value: any): any {
    switch (valueType) {
        case 'str':
            return value === undefined || value === null ? '' : String(value);
        case 'num':
            return Number(value);
        case 'bool':
            return value === true
                || value === 'true'
                || value === 1
                || value === '1';
        case 'json':
            if (typeof value !== 'string') {
                return value;
            }
            if (!value.trim()) {
                return undefined;
            }
            try {
                return JSON.parse(value);
            } catch (error) {
                throw new Error(`Invalid JSON literal: ${(error as Error).message}`);
            }
        case 're':
            return new RegExp(String(value ?? ''));
        default:
            return value;
    }
}

/**
 * Typed-value resolution: object references resolve through `msg`/`flow`/
 * `global`/`env`; legacy prefixed strings keep resolving as references; any
 * other string stays a literal (matching the pre-object behavior).
 */
export function resolveWorkflowTypedValue(value: any, context: ActivityContext): any {
    if (isWorkflowValueRef(value)) {
        switch (value.type) {
            case 'literal':
                return coerceWorkflowLiteral((value as any).valueType, (value as any).value);
            case 'expression':
                throw new Error(
                    'Expression values must be resolved with resolveWorkflowTypedValueAsync'
                );
            case 'msg':
                return readWorkflowProperty((context as any).msg || { payload: (context as any).payload }, value.path);
            case 'flow':
                return readWorkflowProperty((context as any).flow || {}, value.path);
            case 'global':
                return readWorkflowProperty((context as any).global || {}, value.path);
            case 'env':
                return readWorkflowProperty((context as any).env || {}, value.path);
            case 'node':
                // Node-local state for the executing node (Node-RED node context).
                return readWorkflowProperty((context as any).node || {}, value.path);
            default:
                return value;
        }
    }
    if (typeof value === 'string') {
        // Legacy documents may carry surrounding spaces; prefixes were always
        // matched on the trimmed text.
        const text = value.trim();
        const match = LEGACY_PREFIX.exec(text);
        if (!match) {
            return value;
        }
        const path = text.slice(match[0].length);
        return resolveWorkflowTypedValue({ type: match[1] as any, path } as WorkflowValueRef, context);
    }
    return value;
}

/** `{{expr: payload.total * 2 }}` inline expression markers. */
const EXPRESSION_MARKER = /\{\{\s*expr:([\s\S]*?)\s*\}\}/g;
const SOLE_EXPRESSION_MARKER = /^\{\{\s*expr:([\s\S]*?)\s*\}\}$/;

/** Expression bodies referenced by a stored value's `{{expr: ...}}` markers. */
export function workflowExpressionMarkers(value: any): string[] {
    if (typeof value !== 'string') {
        return [];
    }
    const found: string[] = [];
    EXPRESSION_MARKER.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = EXPRESSION_MARKER.exec(value))) {
        found.push(match[1]);
    }
    return found;
}

/** A string that is only one marker keeps the evaluated value's type. */
export function isSoleExpressionMarker(value: any): boolean {
    return typeof value === 'string' && SOLE_EXPRESSION_MARKER.test(value.trim());
}

/**
 * Replace every `{{expr: ...}}` marker in a string with its evaluated value.
 * A value that is only one marker returns the raw result (objects included);
 * mixed text interpolates stringified results.
 */
export async function resolveWorkflowExpressionMarkers(
    value: string,
    context: ActivityContext
): Promise<any> {
    if (isSoleExpressionMarker(value)) {
        const sole = SOLE_EXPRESSION_MARKER.exec(value.trim());
        return evaluateWorkflowExpression(sole ? sole[1] : '', context);
    }
    const text = String(value ?? '');
    let result = '';
    let lastIndex = 0;
    EXPRESSION_MARKER.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = EXPRESSION_MARKER.exec(text))) {
        result += text.slice(lastIndex, match.index);
        const resolved = await evaluateWorkflowExpression(match[1], context);
        result += resolved === undefined || resolved === null ? '' : String(resolved);
        lastIndex = match.index + match[0].length;
    }
    return result + text.slice(lastIndex);
}

/**
 * Async twin of {@link resolveWorkflowTypedValue}: expressions need an
 * evaluator, everything else resolves synchronously.
 */
export async function resolveWorkflowTypedValueAsync(
    value: any,
    context: ActivityContext
): Promise<any> {
    if (isWorkflowValueRef(value) && value.type === 'expression') {
        return evaluateWorkflowExpression(value.value, context);
    }
    return resolveWorkflowTypedValue(value, context);
}

/**
 * Resolve `{{expr: ...}}` markers inside a JSON-ish value tree (objects and
 * arrays included). Plain strings and non-string values pass through, so this
 * is safe for config objects that are mostly literals.
 */
export async function resolveWorkflowMarkersAsync(value: any, context: ActivityContext): Promise<any> {
    if (typeof value === 'string') {
        return workflowExpressionMarkers(value).length
            ? resolveWorkflowExpressionMarkers(value, context)
            : value;
    }
    if (Array.isArray(value)) {
        return Promise.all(value.map(item => resolveWorkflowMarkersAsync(item, context)));
    }
    if (value && typeof value === 'object') {
        const resolved: Record<string, any> = {};
        for (const [key, item] of Object.entries(value)) {
            resolved[key] = await resolveWorkflowMarkersAsync(item, context);
        }
        return resolved;
    }
    return value;
}

/** Stored value split into the selector source plus editable text. */
export function decodeWorkflowTypedValue(value: any): { source: WorkflowTypedSource; text: string } {
    if (isWorkflowValueRef(value)) {
        if (value.type === 'literal') {
            const literalType = (value as any).valueType as WorkflowLiteralType | undefined;
            return {
                source: literalType && literalType !== 'str' && LITERAL_TYPES.includes(literalType)
                    ? literalType as WorkflowTypedSource
                    : 'literal',
                text: (value as any).value === undefined || (value as any).value === null
                    ? ''
                    : String((value as any).value)
            };
        }
        if (value.type === 'expression') {
            return { source: 'expression', text: String((value as any).value ?? '') };
        }
        return { source: value.type as WorkflowTypedSource, text: value.path ? String(value.path) : '' };
    }
    if (typeof value === 'string') {
        const match = LEGACY_PREFIX.exec(value);
        return match
            ? { source: match[1] as WorkflowTypedSource, text: value.slice(match[0].length) }
            : { source: 'literal', text: value };
    }
    if (value === undefined || value === null) {
        return { source: 'literal', text: '' };
    }
    return { source: 'literal', text: String(value) };
}

/**
 * Report an unusable typed literal before the workflow runs. References and
 * plain strings have nothing to validate here.
 */
export function validateWorkflowTypedValue(value: any): string | undefined {
    if (!isWorkflowValueRef(value)) {
        return undefined;
    }
    if (value.type === 'expression') {
        const message = validateWorkflowExpression(value.value);
        return message ? `Expression error: ${message}` : undefined;
    }
    if (value.type !== 'literal') {
        return undefined;
    }
    const literalType = (value as any).valueType as WorkflowLiteralType | undefined;
    const raw = (value as any).value;
    if (literalType === 'json') {
        try {
            coerceWorkflowLiteral('json', raw);
        } catch (error) {
            return (error as Error).message;
        }
        return undefined;
    }
    if (literalType === 're') {
        try {
            // eslint-disable-next-line no-new
            new RegExp(String(raw ?? ''));
        } catch {
            return `Invalid regular expression: ${String(raw ?? '')}`;
        }
        return undefined;
    }
    if (literalType === 'num') {
        const text = String(raw ?? '').trim();
        if (text && !Number.isFinite(Number(text))) {
            return `Not a number: ${text}`;
        }
    }
    return undefined;
}

/**
 * Encode a selector choice and its text back into the stored form.
 *
 * `literal` stays a plain string so existing documents (and the historical
 * number/boolean coercion used by node defaults) are unaffected; every other
 * source is stored explicitly so it can never be mistaken for text.
 */
export function encodeWorkflowTypedValue(source: string, text: string): WorkflowValueRef | string {
    if (source === 'expression') {
        return { type: 'expression', value: text };
    }
    if ((REFERENCE_TYPES as readonly string[]).includes(source)) {
        return { type: source as WorkflowValueRef['type'], path: text } as WorkflowValueRef;
    }
    if (source !== 'literal' && (LITERAL_TYPES as string[]).includes(source)) {
        return { type: 'literal', valueType: source as WorkflowLiteralType, value: text };
    }
    return text;
}

/** Shared codec so the dynamic form edits references without losing their type. */
export const WORKFLOW_TYPED_CODEC: DynamicFormTypedCodec = {
    decode: decodeWorkflowTypedValue,
    encode: encodeWorkflowTypedValue,
    isReference: isWorkflowTypedReference
};
