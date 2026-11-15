import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../src/visual/i18n';

let acornPromise: Promise<any> | undefined;

function loadAcorn(): Promise<any> {
    if (!acornPromise) {
        acornPromise = import('acorn');
    }
    return acornPromise;
}

let scopeAnalyzerPromise: Promise<any> | undefined;

function loadScopeAnalyzer(): Promise<any> {
    if (!scopeAnalyzerPromise) {
        // @ts-ignore - eslint-scope ships no type declarations for browsers.
        scopeAnalyzerPromise = import('eslint-scope');
    }
    return scopeAnalyzerPromise;
}

export interface FunctionSyntaxError {
    /** Zero-based line. */
    line: number;
    /** Zero-based column. */
    ch: number;
    message: string;
}

export interface CodeDiagnostic extends FunctionSyntaxError {
    endLine: number;
    endCh: number;
    severity: 'error' | 'warning';
}

const FUNCTION_PREFIX = '(async () => {\n';

interface FunctionParse {
    ast?: any;
    error?: FunctionSyntaxError;
}

/**
 * Parse function code the same way the runtime executes it (async function
 * body). Acorn reports offsets in the wrapped source, so they are mapped back
 * to the user's text.
 */
async function parseFunctionSource(text: string): Promise<FunctionParse> {
    let acorn: any;
    try {
        acorn = await loadAcorn();
    } catch {
        return {};
    }
    try {
        const ast = acorn.parse(`${FUNCTION_PREFIX}${text}\n})`, {
            ecmaVersion: 'latest',
            sourceType: 'script',
            ranges: true
        });
        return { ast };
    } catch (error: any) {
        const raw = Number(error?.pos);
        const offset = Number.isFinite(raw) ? Math.max(0, raw - FUNCTION_PREFIX.length) : 0;
        const before = text.slice(0, offset);
        const lines = before.split('\n');
        return {
            error: {
                line: Math.max(0, lines.length - 1),
                ch: lines[lines.length - 1]?.length || 0,
                message: String(error?.message || error).replace(/\s*\(\d+:\d+\)$/, '')
            }
        };
    }
}

/**
 * Syntax-only check kept for hosts/tests that only need the first parse error.
 * `analyzeFunctionCode` adds semantic diagnostics on top of it.
 */
export async function findFunctionSyntaxError(text: string): Promise<FunctionSyntaxError | undefined> {
    return (await parseFunctionSource(text)).error;
}

function positionFromOffset(text: string, offset: number): { line: number; ch: number } {
    const before = text.slice(0, Math.max(0, offset));
    const lines = before.split('\n');
    return {
        line: Math.max(0, lines.length - 1),
        ch: lines[lines.length - 1]?.length || 0
    };
}

function positionFromMessage(text: string, message: string): { line: number; ch: number } | undefined {
    const lineColumn = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
    if (lineColumn) {
        return {
            line: Math.max(0, Number(lineColumn[1]) - 1),
            ch: Math.max(0, Number(lineColumn[2]) - 1)
        };
    }
    const position = /position\s+(\d+)/i.exec(message);
    if (position) {
        return positionFromOffset(text, Number(position[1]));
    }
    return undefined;
}

/**
 * V8 no longer includes a position in every `JSON.parse` message. Acorn's
 * expression parser reports the same offset for the usual JSON typos, so use
 * it as a best-effort locator while `JSON.parse` remains the validity check.
 */
async function jsonErrorPosition(text: string): Promise<{ line: number; ch: number } | undefined> {
    try {
        const acorn = await loadAcorn();
        acorn.parse(`(${text}\n)`, {
            ecmaVersion: 'latest',
            sourceType: 'script'
        });
        return undefined;
    } catch (error: any) {
        const raw = Number(error?.pos);
        return Number.isFinite(raw) ? positionFromOffset(text, Math.max(0, raw - 1)) : undefined;
    }
}

/**
 * Validate the raw-JSON textarea shown by `dynamic-form` when the user flips
 * an object field to JSON mode. JSON is not an async function body, so it must
 * never be parsed with `findFunctionSyntaxError`.
 */
export async function findJsonSyntaxError(text: string): Promise<FunctionSyntaxError | undefined> {
    if (!text.trim()) {
        return undefined;
    }
    try {
        JSON.parse(text);
        return undefined;
    } catch (error: any) {
        const message = String(error?.message || error);
        const position = positionFromMessage(text, message) || await jsonErrorPosition(text) || { line: 0, ch: 0 };
        return {
            line: position.line,
            ch: position.ch,
            message: message
                .replace(/\s+in JSON at position \d+.*$/i, '')
                .replace(/\s*\(line \d+ column \d+\)$/i, '')
                .replace(/,\s*[\s\S]*?\s*is not valid JSON$/i, '')
                .trim()
        };
    }
}

/**
 * Globals available to a Function node without an explicit declaration.
 * The runtime executes the body through `new Function('context','input','msg')`
 * in strict mode, so `require`/`module`/`__dirname` are intentionally absent.
 */
const FUNCTION_GLOBALS = new Set([
    'undefined', 'NaN', 'Infinity', 'globalThis', 'arguments', 'eval',
    'Object', 'Function', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt',
    'Math', 'JSON', 'Date', 'RegExp', 'Promise', 'Reflect', 'Proxy',
    'Map', 'Set', 'WeakMap', 'WeakSet', 'WeakRef', 'FinalizationRegistry',
    'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Atomics',
    'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
    'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array',
    'BigInt64Array', 'BigUint64Array',
    'Intl', 'WebAssembly', 'Iterator',
    'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'AggregateError',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite',
    'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
    'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask',
    'structuredClone', 'fetch', 'Request', 'Response', 'Headers', 'FormData', 'Blob', 'File',
    'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'AbortController', 'AbortSignal',
    'atob', 'btoa', 'crypto', 'performance', 'navigator',
    'window', 'document', 'location', 'localStorage', 'sessionStorage',
    'Event', 'CustomEvent', 'EventTarget', 'MessageChannel', 'BroadcastChannel',
    'Worker', 'WebSocket', 'XMLHttpRequest',
    'process', 'Buffer',
    // Workflow function arguments.
    'context', 'input', 'msg'
]);

function codeMessage(
    translator: Translator | undefined,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    const text = translateWorkflow(translator, translator?.currentLocale || 'en', key, fallback, params);
    if (!params) {
        return text;
    }
    return String(text).replace(/\{(\w+)\}/g, (match, name) => {
        const value = params[name];
        return value === undefined || value === null ? match : String(value);
    });
}

function diagnosticFor(
    text: string,
    prefixLength: number,
    start: number,
    end: number,
    message: string,
    severity: 'error' | 'warning'
): CodeDiagnostic {
    const from = positionFromOffset(text, start - prefixLength);
    const to = positionFromOffset(text, end - prefixLength);
    return {
        line: from.line,
        ch: from.ch,
        endLine: to.line,
        endCh: to.ch,
        message,
        severity
    };
}

function eachAstChild(node: any, visit: (child: any) => void): void {
    if (!node || typeof node.type !== 'string') {
        return;
    }
    for (const key of Object.keys(node)) {
        if (key === 'start' || key === 'end' || key === 'range' || key === 'loc') {
            continue;
        }
        const value = node[key];
        if (Array.isArray(value)) {
            value.forEach(item => {
                if (item && typeof item.type === 'string') {
                    visit(item);
                }
            });
        } else if (value && typeof value.type === 'string') {
            visit(value);
        }
    }
}

function isTerminator(node: any): boolean {
    return node?.type === 'ReturnStatement'
        || node?.type === 'ThrowStatement'
        || node?.type === 'BreakStatement'
        || node?.type === 'ContinueStatement';
}

function collectUnreachable(
    node: any,
    text: string,
    prefixLength: number,
    translator: Translator | undefined,
    output: CodeDiagnostic[]
): void {
    if (!node || typeof node.type !== 'string') {
        return;
    }
    const body = node.type === 'Program' || node.type === 'BlockStatement'
        ? node.body
        : node.type === 'SwitchCase'
            ? node.consequent
            : undefined;
    if (Array.isArray(body)) {
        let terminated = false;
        for (const statement of body) {
            if (terminated && statement.type !== 'FunctionDeclaration' && statement.type !== 'EmptyStatement') {
                output.push(diagnosticFor(
                    text,
                    prefixLength,
                    statement.start,
                    statement.end,
                    codeMessage(translator, 'workflow.code.unreachable', 'Unreachable code.'),
                    'warning'
                ));
                // One marker per block is enough; do not spam every following line.
                terminated = false;
            }
            if (isTerminator(statement)) {
                terminated = true;
            }
        }
    }
    eachAstChild(node, child => collectUnreachable(child, text, prefixLength, translator, output));
}

export async function analyzeFunctionCode(
    text: string,
    translator?: Translator
): Promise<CodeDiagnostic[]> {
    const parsed = await parseFunctionSource(text);
    if (parsed.error) {
        return [{
            ...parsed.error,
            endLine: parsed.error.line,
            endCh: parsed.error.ch + 1,
            severity: 'error'
        }];
    }
    if (!parsed.ast) {
        return [];
    }
    let scopeAnalyzer: any;
    try {
        scopeAnalyzer = await loadScopeAnalyzer();
    } catch {
        return [];
    }
    const output: CodeDiagnostic[] = [];
    let manager: any;
    try {
        manager = scopeAnalyzer.analyze(parsed.ast, {
            ecmaVersion: 2022,
            sourceType: 'script'
        });
    } catch {
        return output;
    }
    const prefixLength = FUNCTION_PREFIX.length;
    const reportedUndefined = new Set<string>();

    // Undefined names: eslint-scope leaves unresolved references on the global
    // scope. Filter the runtime/browser globals and the three function args.
    for (const reference of manager.globalScope?.through || []) {
        const identifier = reference?.identifier;
        const name = identifier?.name;
        if (!name || FUNCTION_GLOBALS.has(name) || reportedUndefined.has(name)) {
            continue;
        }
        reportedUndefined.add(name);
        output.push(diagnosticFor(
            text,
            prefixLength,
            identifier.start,
            identifier.end,
            codeMessage(translator, 'workflow.code.undefinedName', '"{name}" is not defined.', { name }),
            'warning'
        ));
    }

    for (const scope of manager.scopes || []) {
        for (const variable of scope.variables || []) {
            const definition = variable.defs?.[0];
            if (!definition) {
                continue;
            }
            // Rebinding a const is a runtime TypeError in strict mode.
            if (definition.type === 'Variable' && definition.parent?.kind === 'const') {
                for (const reference of variable.references || []) {
                    if (reference.isWrite?.() && !reference.init) {
                        output.push(diagnosticFor(
                            text,
                            prefixLength,
                            reference.identifier.start,
                            reference.identifier.end,
                            codeMessage(translator, 'workflow.code.constAssign', 'Cannot assign to constant "{name}".', { name: variable.name }),
                            'error'
                        ));
                    }
                }
            }
            // Unused locals; parameters/catch bindings are intentionally skipped
            // because they commonly document a callback signature.
            if (definition.type === 'Variable' || definition.type === 'FunctionName' || definition.type === 'ClassName') {
                if (!variable.name || variable.name.startsWith('_')) {
                    continue;
                }
                const read = (variable.references || []).some((reference: any) => reference.isRead?.());
                if (!read) {
                    const identifier = variable.identifiers?.[0] || definition.name;
                    output.push(diagnosticFor(
                        text,
                        prefixLength,
                        identifier.start,
                        identifier.end,
                        codeMessage(translator, 'workflow.code.unusedName', '"{name}" is defined but never used.', { name: variable.name }),
                        'warning'
                    ));
                }
            }
        }
    }

    collectUnreachable(parsed.ast, text, prefixLength, translator, output);
    return output;
}

function collectDuplicateJsonKeys(
    node: any,
    text: string,
    translator: Translator | undefined,
    output: CodeDiagnostic[]
): void {
    if (!node || typeof node.type !== 'string') {
        return;
    }
    if (node.type === 'ObjectExpression') {
        const seen = new Set<string>();
        for (const property of node.properties || []) {
            if (property.type !== 'Property') {
                continue;
            }
            const keyNode = property.key;
            const key = keyNode?.type === 'Literal'
                ? String(keyNode.value)
                : keyNode?.type === 'Identifier' ? keyNode.name : undefined;
            if (key !== undefined) {
                if (seen.has(key)) {
                    output.push(diagnosticFor(
                        text,
                        1,
                        keyNode.start,
                        keyNode.end,
                        codeMessage(translator, 'workflow.code.duplicateKey', 'Duplicate key "{key}".', { key }),
                        'warning'
                    ));
                } else {
                    seen.add(key);
                }
            }
            collectDuplicateJsonKeys(property.value, text, translator, output);
        }
        return;
    }
    eachAstChild(node, child => collectDuplicateJsonKeys(child, text, translator, output));
}

export async function analyzeJsonCode(
    text: string,
    translator?: Translator
): Promise<CodeDiagnostic[]> {
    const syntax = await findJsonSyntaxError(text);
    if (syntax) {
        return [{
            ...syntax,
            endLine: syntax.line,
            endCh: syntax.ch + 1,
            severity: 'error'
        }];
    }
    if (!text.trim()) {
        return [];
    }
    let acorn: any;
    try {
        acorn = await loadAcorn();
    } catch {
        return [];
    }
    try {
        const ast = acorn.parse(`(${text}\n)`, {
            ecmaVersion: 'latest',
            sourceType: 'script',
            ranges: true
        });
        const output: CodeDiagnostic[] = [];
        collectDuplicateJsonKeys(ast, text, translator, output);
        return output;
    } catch {
        return [];
    }
}

