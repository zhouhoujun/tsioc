import { parseYaml, stringifyYaml } from './workflow-yaml';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
import {
    IVisualWorkflowNode,
    NodeConnection,
    VisualWorkflowDefinition
} from './types';

async function pause(ms: number, cancelled?: () => boolean): Promise<boolean> {
    const total = Math.max(0, ms);
    if (!cancelled) {
        if (total > 0) {
            await new Promise(resolve => setTimeout(resolve, total));
        }
        return true;
    }
    const step = 50;
    let remaining = total;
    while (remaining > 0) {
        if (cancelled()) {
            return false;
        }
        const slice = Math.min(step, remaining);
        await new Promise(resolve => setTimeout(resolve, slice));
        remaining -= slice;
    }
    return !cancelled();
}

/**
 * Extra execution data the engine resolves before a node runs. Branch node
 * results are attached for join-style nodes so they can merge their inputs.
 */
export interface VisualNodeExecutionExtras {
    /** True once the run has been cancelled or timed out. */
    cancelled?: () => boolean;
    /** Mutable per-node runtime state (rate limits, timers). */
    nodeState?: Record<string, any>;
    incoming?: Array<{
        connectionId: string;
        sourcePort?: string;
        nodeId: string;
        result?: ActivityResult;
    }>;
}

export interface VisualNodeRuntimeHost {
    /**
     * Allow a subprocess node to execute another visual definition.
     */
    executeDefinition?(definition: VisualWorkflowDefinition, context: ActivityContext): Promise<ActivityResult>;
    /**
     * Execute a node supplied by an installed workflow plugin. Returning
     * `undefined` means no plugin executor handles this node type.
     */
    executeNode?(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult | undefined> | ActivityResult | undefined;
    /** Resolve a referenced sub-workflow by id (host store/library). */
    resolveDefinition?(id: string): Promise<VisualWorkflowDefinition | undefined> | VisualWorkflowDefinition | undefined;
}

/** Parse a text payload as JSON when possible (file-in auto mode). */
function parsePayloadText(text: string): any {
    const trimmed = String(text ?? '').trim();
    if (!trimmed) {
        return text;
    }
    if (!/^[[{]/.test(trimmed)) {
        return text;
    }
    try {
        return JSON.parse(trimmed);
    } catch {
        return text;
    }
}

export interface WorkflowMqttSettings {
    url: string;
    topic: string;
    qos: number;
    clientId?: string;
    username?: string;
    password?: string;
    keepalive?: number;
    clean?: boolean;
    will?: { topic: string; payload: string; qos?: number; retain?: boolean };
    tls?: { ca?: string; cert?: string; key?: string; servername?: string; rejectUnauthorized?: boolean };
}

/**
 * Resolve MQTT settings for a node. Prefer a shared `mqtt` config node
 * (`config.mqtt = '<id>'`) so the broker URL, identity and TLS are configured
 * once; node-level values still win when present (backwards compatible with
 * workflows that inline the URL).
 */
export async function resolveMqttConfig(
    config: Record<string, any>,
    context: ActivityContext
): Promise<WorkflowMqttSettings> {
    const id = String(config?.mqtt || '').trim();
    const nodes = (context as any)?.configNodes || {};
    const shared = id ? nodes[id] : undefined;
    if (id && !shared) {
        throw new Error(`MQTT config not found: ${id}. Add an mqtt config node or inline the broker settings.`);
    }
    const pick = (key: string): any => {
        const local = config?.[key];
        if (local !== undefined && local !== null && local !== '') {
            return local;
        }
        return shared?.[key];
    };
    const url = String(await resolveCredentialValue(pick('url'), context) ?? '').trim();
    const topic = String(await resolveCredentialValue(pick('topic'), context) ?? '').trim();
    const tlsId = String(pick('tls') || '').trim();
    const willTopic = String(await resolveCredentialValue(pick('willTopic'), context) ?? '').trim();
    return {
        url,
        topic,
        qos: Number(pick('qos')) || 0,
        clientId: pick('clientId') ? String(pick('clientId')) : undefined,
        username: String(await resolveCredentialValue(pick('username'), context) ?? '') || undefined,
        password: String(await resolveCredentialValue(pick('password'), context) ?? '') || undefined,
        keepalive: Number.isFinite(Number(pick('keepalive'))) ? Number(pick('keepalive')) : undefined,
        clean: pick('clean') === undefined || pick('clean') === null || pick('clean') === ''
            ? undefined
            : pick('clean') !== false && pick('clean') !== 'false',
        will: willTopic
            ? {
                topic: willTopic,
                payload: String(await resolveCredentialValue(pick('willPayload'), context) ?? ''),
                qos: Number(pick('willQos')) === 1 ? 1 : 0,
                retain: pick('willRetain') === true || pick('willRetain') === 'true'
            }
            : undefined,
        tls: tlsId ? await resolveTlsOptions({ tls: tlsId }, context) : undefined
    };
}

/** Resolved listener settings for `websocket-in` / `websocket-out`. */
export interface WorkflowWebSocketListenerSettings {
    host: string;
    port: number;
    path?: string;
    tls?: {
        ca?: string;
        cert?: string;
        key?: string;
        servername?: string;
        rejectUnauthorized?: boolean;
    };
    /** Id of the referenced `websocket` config node, when one is used. */
    listenerId?: string;
}

/**
 * Resolve a `websocket` listener config node. Inline node values win so a
 * single node can override the shared host/port/path without editing the
 * config node; when no config node is referenced the node's own fields are
 * used (the legacy server form).
 */
export async function resolveWebSocketListenerConfig(
    config: Record<string, any>,
    context: ActivityContext
): Promise<WorkflowWebSocketListenerSettings> {
    const listenerId = String(config?.websocket || '').trim();
    const nodes = (context as any)?.configNodes || {};
    const shared = listenerId ? nodes[listenerId] : undefined;
    if (listenerId && !shared) {
        throw new Error(`WebSocket config not found: ${listenerId}. Add a WebSocket listener config node or clear the reference.`);
    }
    const pick = (key: string): any => {
        const local = config?.[key];
        if (local !== undefined && local !== null && local !== '') {
            return local;
        }
        return shared?.[key];
    };
    const host = String(await resolveCredentialValue(pick('host'), context) ?? '').trim() || '0.0.0.0';
    const port = Math.max(0, Math.min(65535, Number(pick('port')) || 0));
    const pathValue = String(await resolveCredentialValue(pick('path'), context) ?? '').trim();
    const tlsId = String(pick('tls') || '').trim();
    return {
        host,
        port,
        path: pathValue || undefined,
        tls: tlsId ? await resolveTlsOptions({ tls: tlsId }, context) : undefined,
        listenerId: listenerId || undefined
    };
}

/**
 * Resolve the TLS options referenced by a node's `tls` field. The referenced
 * `tls` config node lives in the workflow definition and is exposed to the
 * runtime through `context.configNodes`.
 */
export async function resolveTlsOptions(
    config: Record<string, any>,
    context: ActivityContext
): Promise<{ ca?: string; cert?: string; key?: string; servername?: string; rejectUnauthorized?: boolean } | undefined> {
    const id = String(config?.tls || '').trim();
    if (!id) {
        return undefined;
    }
    const nodes = (context as any)?.configNodes || {};
    const entry = nodes[id];
    if (!entry) {
        throw new Error(`TLS config not found: ${id}. Add a TLS config node or clear the reference.`);
    }
    const read = async (value: any) => {
        const resolved = await resolveCredentialValue(value, context);
        return resolved === undefined || resolved === null || resolved === '' ? undefined : String(resolved);
    };
    return {
        ca: await read(entry.ca),
        cert: await read(entry.cert),
        key: await read(entry.key),
        servername: entry.servername ? String(entry.servername) : undefined,
        rejectUnauthorized: entry.rejectUnauthorized !== false
    };
}

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
 * returned as-is so node configs remain JSON friendly.
 */
export function resolveWorkflowValue(source: any, context: ActivityContext): any {
    if (typeof source === 'function') {
        return source(context);
    }
    if (source === undefined || source === null) {
        return source;
    }
    if (typeof source === 'object' && !Array.isArray(source)
        && typeof (source as any).type === 'string') {
        return resolveValueRef(source as any, context);
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

/** Resolve a typed value descriptor against msg/flow/global/env. */
function resolveValueRef(ref: { type: string; path?: string; value?: any }, context: ActivityContext): any {
    switch (ref.type) {
        case 'literal':
            return ref.value;
        case 'msg':
            return resolveFrom((context as any).msg || { payload: (context as any).payload }, ref.path);
        case 'flow':
            return resolveFrom((context as any).flow || {}, ref.path);
        case 'global':
            return resolveFrom((context as any).global || {}, ref.path);
        case 'env':
            return resolveFrom((context as any).env || {}, ref.path);
        default:
            return ref;
    }
}

function matchRouterRule(actual: any, operator: string, expected: any): boolean {
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
 * Resolve a typed compare value. The inspector stores non-literal sources as
 * `msg.` / `flow.` / `global.` / `env.` prefixes (or a ValueRef object); plain
 * strings stay literal so existing rules keep comparing text.
 */
function resolveCompareValue(value: any, context: ActivityContext): any {
    if (value && typeof value === 'object' && !Array.isArray(value)
        && typeof (value as any).type === 'string') {
        return resolveWorkflowValue(value, context);
    }
    if (typeof value === 'string' && /^(msg|flow|global|env)\./.test(value.trim())) {
        return resolveWorkflowValue(value, context);
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
        return compareValues(actual, String(config.operator || 'truthy'), resolveCompareValue(config.value, context));
    }
    return true;
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
    const scopeFor = (item: any, parent: any): any =>
        item && typeof item === 'object' && !Array.isArray(item)
            ? { ...parent, ...item, '.': item }
            : { ...parent, '.': item };
    const render = (source: string, scope: any): string => {
        let text = source;
        // Mustache-style sections: arrays render the block per item, objects
        // once, falsy values render nothing. Nested sections with different
        // keys are handled because the block body is rendered recursively.
        const section = /\{\{#\s*([^}]+?)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/;
        let match: RegExpExecArray | null;
        let guard = 0;
        while ((match = section.exec(text)) && guard++ < 1000) {
            const value = resolveTemplateKey(match[1].trim(), scope);
            let replacement = '';
            if (Array.isArray(value)) {
                replacement = value.map(item => render(match![2], scopeFor(item, scope))).join('');
            } else if (value && typeof value === 'object') {
                replacement = render(match[2], scopeFor(value, scope));
            } else if (value) {
                replacement = render(match[2], scope);
            }
            text = text.slice(0, match.index) + replacement + text.slice(match.index + match[0].length);
        }
        return text.replace(/\{\{\{?\s*([^}]+?)\s*\}?\}\}/g, (_all, key: string) => {
            const value = key.trim() === '.' ? scope?.['.'] : resolveTemplateKey(key.trim(), scope);
            if (value === undefined || value === null) {
                return '';
            }
            return String(value);
        });
    };
    return render(String(template ?? ''), context);
}

function resolveTemplateKey(key: string, scope: any): any {
    const path = String(key || '').trim();
    if (!path) {
        return undefined;
    }
    let value: any = scope;
    for (const part of path.replace(/^\$?\.?/, '').split('.').filter(Boolean)) {
        if (value === undefined || value === null) {
            return undefined;
        }
        value = value[part];
    }
    return value;
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


function decodeXmlEntities(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

function parseXmlDocument(text: string): any {
    const root: any = {};
    const stack: any[] = [root];
    const tagPattern = /<([^>]+)>/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(text))) {
        const between = text.slice(lastIndex, match.index).trim();
        if (between) {
            const current = stack[stack.length - 1];
            current['#text'] = current['#text']
                ? `${current['#text']} ${decodeXmlEntities(between)}`
                : decodeXmlEntities(between);
        }
        let tag = match[1].trim();
        lastIndex = tagPattern.lastIndex;
        if (tag.startsWith('?') || tag.startsWith('!')) {
            continue;
        }
        if (tag.startsWith('/')) {
            if (stack.length > 1) {
                stack.pop();
            }
            continue;
        }
        const selfClosing = tag.endsWith('/');
        if (selfClosing) {
            tag = tag.slice(0, -1).trim();
        }
        const name = (tag.match(/^([^\s/]+)/) || [])[1] || tag;
        const attrs: Record<string, string> = {};
        const attrPattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
        let attr: RegExpExecArray | null;
        while ((attr = attrPattern.exec(tag))) {
            attrs[attr[1]] = decodeXmlEntities(attr[2] ?? attr[3] ?? '');
        }
        const node: any = Object.keys(attrs).length ? { '@attrs': attrs } : {};
        const parent = stack[stack.length - 1];
        if (parent[name] === undefined) {
            parent[name] = node;
        } else if (Array.isArray(parent[name])) {
            parent[name].push(node);
        } else {
            parent[name] = [parent[name], node];
        }
        if (!selfClosing) {
            stack.push(node);
        }
    }
    return root;
}

function serializeXmlValue(name: string, value: any, pretty: boolean, depth = 0): string {
    const indent = pretty ? '  '.repeat(depth) : '';
    const newline = pretty ? '\n' : '';
    if (Array.isArray(value)) {
        return value.map(item => serializeXmlValue(name, item, pretty, depth)).join(newline);
    }
    if (value === null || value === undefined || typeof value !== 'object') {
        return `${indent}<${name}>${String(value ?? '')}</${name}>${newline}`;
    }
    const attrs = value['@attrs'] as Record<string, string> | undefined;
    const attrText = attrs
        ? Object.entries(attrs).map(([key, val]) => ` ${key}="${String(val).replace(/"/g, '&quot;')}"`).join('')
        : '';
    const text = value['#text'] === undefined ? '' : String(value['#text']);
    const children = Object.entries(value)
        .filter(([key]) => key !== '@attrs' && key !== '#text')
        .map(([key, child]) => serializeXmlValue(key, child, pretty, depth + 1))
        .join('');
    if (!text && !children) {
        return `${indent}<${name}${attrText}/>${newline}`;
    }
    return `${indent}<${name}${attrText}>${newline}${children}${text ? indent + (pretty ? '  ' : '') + text + newline : ''}${indent}</${name}>${newline}`;
}

function pruneXmlValue(value: any, attributes: boolean, text: boolean): any {
    if (Array.isArray(value)) {
        return value.map(item => pruneXmlValue(item, attributes, text));
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    const next: Record<string, any> = {};
    Object.entries(value).forEach(([key, child]) => {
        if (key === '@attrs' && !attributes) {
            return;
        }
        if (key === '#text' && !text) {
            return;
        }
        next[key] = pruneXmlValue(child, attributes, text);
    });
    return next;
}

function htmlAttributes(text: string, attribute: string): string[] {
    const values: string[] = [];
    const pattern = new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
        const value = decodeXmlEntities(match[1] ?? match[2] ?? '');
        if (value && !values.includes(value)) {
            values.push(value);
        }
    }
    return values;
}

function stripHtml(text: string): string {
    return decodeXmlEntities(
        text
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    );
}

function htmlLinks(text: string): string[] {
    const links: string[] = [];
    const pattern = /(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
        const value = decodeXmlEntities(match[1] ?? match[2] ?? '');
        if (value && !links.includes(value)) {
            links.push(value);
        }
    }
    return links;
}

async function waitForWorkflowEvent(context: ActivityContext, event: string, timeoutMs: number): Promise<any> {
    const bus = (context as any).eventBus || (context as any).events;
    if (bus && typeof bus.wait === 'function') {
        return bus.wait(event, timeoutMs);
    }
    if (typeof (context as any).waitEvent === 'function') {
        const waiting = Promise.resolve((context as any).waitEvent(event));
        if (!timeoutMs) {
            return waiting;
        }
        return Promise.race([
            waiting,
            new Promise(resolve => setTimeout(() => resolve(undefined), timeoutMs))
        ]);
    }
    throw new Error(`Event injection requires an event bus for "${event}"`);
}

async function runHttp(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
    const resolvedUrl = resolveWorkflowValue(config.url, context);
    const rawUrl = typeof config.url === 'string' ? config.url.trim() : '';
    // Literal endpoints must not be mistaken for dotted context paths.
    const url = resolvedUrl || (/^[a-z][a-z0-9+.-]*:/i.test(rawUrl) ? rawUrl : resolvedUrl);
    if (!url) {
        return {
            success: false,
            error: new Error('HTTP request URL is required. Set the URL field or point it at a context value.'),
            data: { nodeId: node.id }
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
        const headers: Record<string, any> = coerceJson(config.headers) || {};
        const authType = String(config.authType || 'none');
        if (authType === 'basic') {
            const username = String(await resolveCredentialValue(config.username, context) ?? '');
            const password = String(await resolveCredentialValue(config.password, context) ?? '');
            const raw = `${username}:${password}`;
            const encoded = typeof btoa === 'function'
                ? btoa(raw)
                : (globalThis as any).Buffer?.from(raw).toString('base64') || '';
            headers.Authorization = `Basic ${encoded}`;
        } else if (authType === 'bearer') {
            const token = String(await resolveCredentialValue(config.token, context) ?? '');
            headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetchImpl(String(url), {
            method: String(config.method || 'GET').toUpperCase(),
            headers: Object.keys(headers).length ? headers : undefined,
            body: config.body === undefined || config.body === '' ? undefined : String(config.body),
            redirect: config.followRedirects === false ? 'manual' : 'follow'
        });
        const text = await response.text();
        const responseHeaders: Record<string, string> = {};
        try {
            response.headers?.forEach?.((value: string, key: string) => {
                responseHeaders[key] = value;
            });
        } catch {
            // Headers are optional metadata; never fail the request over them.
        }
        const responseType = String(config.responseType || 'auto');
        let body: any = text;
        if (responseType !== 'text') {
            try {
                body = text ? JSON.parse(text) : null;
            } catch (error) {
                if (responseType === 'json') {
                    return {
                        success: false,
                        error: new Error(`Invalid JSON response: ${(error as Error).message}`),
                        data: { nodeId: node.id, status: response.status }
                    };
                }
                body = text;
            }
        }
        return {
            success: response.ok,
            error: response.ok ? undefined : new Error(`HTTP ${response.status}`),
            data: {
                nodeId: node.id,
                status: response.status,
                statusCode: response.status,
                headers: responseHeaders,
                responseUrl: response.url || String(url),
                body
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error as Error,
            data: { nodeId: node.id }
        };
    }
}

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

/**
 * Execute one visual node. The runtime keeps node semantics platform-neutral so
 * the same definition runs from the browser editor, the terminal and a server.
 */
export async function executeVisualNode(
    node: IVisualWorkflowNode,
    context: ActivityContext,
    host?: VisualNodeRuntimeHost,
    extras?: VisualNodeExecutionExtras
): Promise<ActivityResult> {
    const config = node.config || {};

    if (host?.executeNode) {
        const pluginResult = await host.executeNode(node, context);
        if (pluginResult) {
            return pluginResult;
        }
    }

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
        case 'delay': {
            const mode = String(config.mode || 'fixed');
            if (mode === 'rate') {
                const limit = Math.max(1, Number(config.rateCount) || 1);
                const windowMs = Math.max(0, Number(config.rateWindow) || 0);
                const state = extras?.nodeState || {};
                const stamps: number[] = Array.isArray(state.rateStamps) ? state.rateStamps : [];
                const now = Date.now();
                let recent = stamps
                    .filter(stamp => windowMs <= 0 || now - stamp < windowMs)
                    .sort((a, b) => a - b);
                if (recent.length >= limit) {
                    const action = String(config.rateAction || 'drop');
                    if (action === 'queue' && windowMs > 0) {
                        const wait = Math.max(0, recent[0] + windowMs - now);
                        if (!(await pause(wait, extras?.cancelled))) {
                            return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id } };
                        }
                        const after = Date.now();
                        recent = recent.filter(stamp => windowMs <= 0 || after - stamp < windowMs);
                    }
                    if (recent.length >= limit) {
                        if (action === 'queue') {
                            // A concurrent waiter filled the last slot; queue this message too.
                            const wait = Math.max(0, (recent[0] + windowMs) - Date.now());
                            if (!(await pause(wait, extras?.cancelled))) {
                                return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id } };
                            }
                            recent = recent.filter(stamp => windowMs <= 0 || Date.now() - stamp < windowMs);
                        }
                        if (recent.length >= limit) {
                            state.rateStamps = recent;
                            return {
                                success: true,
                                data: { nodeId: node.id, dropped: true, rateLimited: true, mode: 'rate' }
                            };
                        }
                    }
                }
                recent.push(Date.now());
                state.rateStamps = recent;
                return {
                    success: true,
                    data: {
                        nodeId: node.id,
                        delayed: 0,
                        mode: 'rate',
                        rateRemaining: Math.max(0, limit - recent.length)
                    }
                };
            }
            const unit = String(config.unit || 'ms');
            const factor = unit === 's' ? 1000 : unit === 'min' ? 60000 : 1;
            let delay = Math.max(0, Number(config.delay ?? config.duration ?? 0) || 0) * factor;
            if (mode === 'fixed' && config.override === true) {
                const override = Number(resolveWorkflowValue('delay', context));
                if (Number.isFinite(override) && override >= 0) {
                    delay = override;
                }
            }
            if (mode === 'random') {
                const min = Math.max(0, Number(config.randomMin) || 0) * factor;
                const max = Math.max(min, (Number(config.randomMax) || 0) * factor || min);
                delay = min + Math.random() * (max - min);
            }
            if (!(await pause(delay, extras?.cancelled))) {
                return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id } };
            }
            return { success: true, data: { nodeId: node.id, delayed: delay, mode } };
        }
        case 'loop': {
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
        }
        case 'log':
        case 'debug': {
            if (node.type === 'debug' && config.active === false) {
                return { success: true, data: { nodeId: node.id, skipped: true } };
            }
            const level = String(config.level || 'info');
            const field = config.field === undefined || config.field === null
                ? ''
                : String(config.field).trim();
            const value = config.complete === true
                ? { ...context }
                : field
                    ? resolveWorkflowValue(field, context)
                    : resolveWorkflowValue(config.message, context);
            let message: string;
            if (value !== null && typeof value === 'object') {
                try {
                    message = JSON.stringify(value);
                } catch {
                    message = String(value);
                }
            } else {
                message = String(value ?? '');
            }
            const logger = (context as any).logger;
            if (logger && typeof logger[level] === 'function') {
                logger[level](message);
            }
            if (node.type === 'debug' && config.console === true && typeof console !== 'undefined') {
                const write = (console as any)[level] || console.log;
                write.call(console, message);
            }
            return { success: true, data: { nodeId: node.id, level, message } };
        }
        case 'http-request':
            return runHttp(node, context);
        case 'inject': {
            const trigger = String(config.trigger || 'manual');
            const onceDelay = Math.max(0, Number(config.onceDelay) || 0) * 1000;
            if (onceDelay) {
                await new Promise(resolve => setTimeout(resolve, onceDelay));
            }
            const payloadType = String(config.payloadType || 'json');
            let payload: any;
            if (payloadType === 'string') {
                const text = config.payloadValue === undefined ? config.payload : config.payloadValue;
                payload = text === undefined || text === null ? '' : String(text);
            } else if (payloadType === 'number') {
                payload = Number(config.payloadValue === undefined ? config.payload : config.payloadValue);
            } else if (payloadType === 'boolean') {
                const bool = config.payloadValue === undefined ? config.payload : config.payloadValue;
                payload = bool === true || bool === 'true' || bool === 1 || bool === '1';
            } else if (payloadType === 'timestamp') {
                payload = Date.now();
            } else if (payloadType === 'env') {
                const name = String(config.payloadValue ?? '').trim();
                payload = name ? (context as any).env?.[name] : undefined;
                if (payload === undefined) {
                    return {
                        success: false,
                        error: new Error(`Environment variable "${name || '(empty)'}" is not available.`),
                        data: { nodeId: node.id }
                    };
                }
            } else {
                payload = coerceJson(config.payload ?? {});
            }
            if (trigger === 'event') {
                const event = String(config.event || '').trim();
                if (!event) {
                    return { success: false, error: new Error('Event injection requires an event name'), data: { nodeId: node.id } };
                }
                const timeoutMs = Math.max(0, Number(config.timeout) || 0) * 1000;
                const eventValue = await waitForWorkflowEvent(context, event, timeoutMs);
                if (eventValue !== undefined) {
                    payload = eventValue;
                }
            }
            const topic = config.topic === undefined || config.topic === null
                ? ''
                : String(config.topic);
            const extra: Record<string, any> = {};
            for (const rule of Array.isArray(config.properties) ? config.properties : []) {
                const key = String(rule?.key || '').trim();
                if (!key) {
                    continue;
                }
                const resolved = resolveCompareValue(rule.value, context);
                extra[key] = typeof resolved === 'string' ? coerceJson(resolved) : resolved;
            }
            const finalPayload = extra.payload !== undefined ? extra.payload : payload;
            const base = topic ? { topic } : {};
            const data: Record<string, any> = { nodeId: node.id, ...base, ...extra };
            if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
                Object.assign(data, payload);
            }
            data.payload = finalPayload;
            if (topic || Object.keys(extra).length) {
                data.msg = { ...(topic ? { topic } : {}), ...extra, payload: finalPayload };
            }
            return { success: true, data };
        }
        case 'http-in': {
            const request = (context as any).request;
            if (!request) {
                return {
                    success: true,
                    data: { nodeId: node.id, matched: false, waiting: true, reason: 'No HTTP request' }
                };
            }
            const method = String(config.method || 'ANY').toUpperCase();
            const requestMethod = String(request.method || 'GET').toUpperCase();
            const filterPath = String(config.path || '').trim();
            const requestPath = String(request.path || '');
            const matched = (method === 'ANY' || method === requestMethod)
                && (!filterPath
                    || requestPath === filterPath
                    || requestPath.startsWith(`${filterPath.replace(/\/$/, '')}/`));
            if (!matched) {
                return {
                    success: true,
                    data: {
                        nodeId: node.id,
                        matched: false,
                        reason: `Request ${requestMethod} ${requestPath} did not match ${method} ${filterPath || '*'}`
                    }
                };
            }
            return {
                success: true,
                data: {
                    nodeId: node.id,
                    matched: true,
                    request,
                    method: requestMethod,
                    path: requestPath,
                    query: request.query || {},
                    headers: request.headers || {},
                    body: request.body,
                    files: (request as any).files || {},
                    fields: (request as any).fields || {},
                    payload: request.body
                }
            };
        }
        case 'tcp-in':
        case 'udp-in':
        case 'websocket-in':
        case 'mqtt-in': {
            const inbound = (context as any).inbound;
            const transport = node.type === 'tcp-in'
                ? 'tcp'
                : node.type === 'udp-in'
                    ? 'udp'
                    : node.type === 'mqtt-in'
                        ? 'mqtt'
                        : 'websocket';
            if (!inbound) {
                return {
                    success: true,
                    data: { nodeId: node.id, matched: false, waiting: true, reason: 'No inbound message' }
                };
            }
            if (inbound.nodeId !== node.id || String(inbound.transport || '') !== transport) {
                return {
                    success: true,
                    data: { nodeId: node.id, matched: false, reason: 'Inbound message belongs to another listener' }
                };
            }
            return {
                success: true,
                data: {
                    nodeId: node.id,
                    matched: true,
                    transport,
                    topic: inbound.topic,
                    payload: inbound.payload ?? inbound.data,
                    data: inbound.data,
                    remote: inbound.remote
                }
            };
        }
        case 'tcp-out':
        case 'udp-out':
        case 'websocket-out': {
            const transport = node.type === 'tcp-out' ? 'tcp' : node.type === 'udp-out' ? 'udp' : 'websocket';
            const sender = transport === 'tcp'
                ? (context as any).tcpSend
                : transport === 'udp'
                    ? (context as any).udpSend
                    : (context as any).webSocketSend;
            const broadcastOnly = transport === 'websocket' && String(config.websocket || '').trim().length > 0;
            if (!broadcastOnly && typeof sender !== 'function') {
                return {
                    success: false,
                    error: new Error(
                        `${transport.toUpperCase()} sending requires a workflow host with network access. `
                        + 'Run the workflow with `tsdi-agent serve` or inject a transport.'
                    ),
                    data: { nodeId: node.id, transport }
                };
            }
            const value = resolveWorkflowValue(config.payload === undefined ? 'payload' : config.payload, context);
            const body = typeof value === 'string' ? value : JSON.stringify(value ?? null);
            const timeoutMs = Math.max(0, Number(config.timeout) || 0) || undefined;
            try {
                if (transport === 'websocket') {
                    const listenerId = String(config.websocket || '').trim();
                    if (listenerId) {
                        const broadcast = (context as any).webSocketBroadcast;
                        if (typeof broadcast !== 'function') {
                            return {
                                success: false,
                                error: new Error(
                                    'WebSocket listener broadcasting requires a workflow host with listener access. '
                                    + 'Run the workflow with `tsdi-agent serve` or inject a broadcaster.'
                                ),
                                data: { nodeId: node.id, transport }
                            };
                        }
                        const settings = await resolveWebSocketListenerConfig(config, context);
                        const clients = await broadcast({ ...settings, payload: body });
                        return {
                            success: true,
                            data: {
                                nodeId: node.id,
                                transport,
                                listener: listenerId,
                                clients: Number(clients) || 0,
                                bytes: body.length
                            }
                        };
                    }
                    const url = String(await resolveCredentialValue(config.url, context) ?? '').trim();
                    if (!url) {
                        return {
                            success: false,
                            error: new Error(
                                'WebSocket out needs a ws:// or wss:// URL, or a shared WebSocket listener config.'
                            ),
                            data: { nodeId: node.id }
                        };
                    }
                    const tls = await resolveTlsOptions(config, context);
                    const headers = coerceJson(config.headers);
                    await sender({
                        url,
                        payload: body,
                        timeoutMs,
                        headers: headers && typeof headers === 'object' && !Array.isArray(headers) ? headers : undefined,
                        tls
                    });
                    return { success: true, data: { nodeId: node.id, transport, url, bytes: body.length } };
                }
                const host = String(await resolveCredentialValue(config.host, context) ?? '').trim();
                const port = Math.max(0, Math.min(65535, Number(config.port) || 0));
                if (!host || !port) {
                    return {
                        success: false,
                        error: new Error(`${transport.toUpperCase()} out needs a host and a port.`),
                        data: { nodeId: node.id }
                    };
                }
                if (transport === 'udp') {
                    await sender({ host, port, payload: body, timeoutMs, broadcast: config.broadcast === true });
                    return {
                        success: true,
                        data: {
                            nodeId: node.id,
                            transport,
                            host,
                            port,
                            broadcast: config.broadcast === true,
                            bytes: body.length
                        }
                    };
                }
                const tls = await resolveTlsOptions(config, context);
                await sender({ host, port, payload: body, timeoutMs, tls });
                return { success: true, data: { nodeId: node.id, transport, host, port, bytes: body.length } };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id, transport } };
            }
        }
        case 'file-in': {
            const read = (context as any).fileRead;
            if (typeof read !== 'function') {
                return {
                    success: false,
                    error: new Error(
                        'File in requires a workflow host with file access. '
                        + 'Run the workflow with `tsdi-agent serve` or inject a file reader.'
                    ),
                    data: { nodeId: node.id }
                };
            }
            const path = String(await resolveCredentialValue(config.path, context) ?? '').trim();
            if (!path) {
                return {
                    success: false,
                    error: new Error('File in needs a path (workspace-relative or absolute).'),
                    data: { nodeId: node.id }
                };
            }
            try {
                const encoding = String(config.encoding || 'utf8');
                const file = await read({ path, encoding });
                const text = String(file?.data ?? '');
                const payload = String(config.parse || 'auto') === 'text' ? text : parsePayloadText(text);
                let removed = false;
                if (config.deleteAfterRead === true) {
                    const remove = (context as any).fileDelete;
                    if (typeof remove !== 'function') {
                        return {
                            success: false,
                            error: new Error(
                                'File in delete-after-read requires a workflow host with file access. '
                                + 'Run the workflow with `tsdi-agent serve` or inject a file remover.'
                            ),
                            data: { nodeId: node.id, path }
                        };
                    }
                    const result = await remove({ path });
                    removed = result?.removed === true;
                }
                return {
                    success: true,
                    data: {
                        nodeId: node.id,
                        payload,
                        path: file?.path || path,
                        size: file?.size ?? text.length,
                        encoding,
                        removed,
                        msg: { payload, topic: 'file', meta: { path: file?.path || path } }
                    }
                };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id, path } };
            }
        }
        case 'file-out': {
            const write = (context as any).fileWrite;
            if (typeof write !== 'function') {
                return {
                    success: false,
                    error: new Error(
                        'File out requires a workflow host with file access. '
                        + 'Run the workflow with `tsdi-agent serve` or inject a file writer.'
                    ),
                    data: { nodeId: node.id }
                };
            }
            const path = String(await resolveCredentialValue(config.path, context) ?? '').trim();
            if (!path) {
                return {
                    success: false,
                    error: new Error('File out needs a path (workspace-relative or absolute).'),
                    data: { nodeId: node.id }
                };
            }
            const value = resolveWorkflowValue(config.payload === undefined ? 'payload' : config.payload, context);
            const encoding = String(config.encoding || 'utf8');
            let data = typeof value === 'string' ? value : JSON.stringify(value ?? null);
            if (config.newline === true && encoding !== 'base64' && !data.endsWith('\n')) {
                data += '\n';
            }
            try {
                const result = await write({
                    path,
                    data,
                    encoding,
                    append: config.append === true,
                    mkdir: config.mkdir !== false
                });
                return {
                    success: true,
                    data: {
                        nodeId: node.id,
                        written: true,
                        path: result?.path || path,
                        bytes: result?.bytes ?? String(data).length,
                        appended: config.append === true,
                        msg: { payload: value, topic: 'file', meta: { path: result?.path || path } }
                    }
                };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id, path } };
            }
        }
        case 'watch': {
            const inbound = (context as any).inbound;
            if (!inbound) {
                return { success: true, data: { nodeId: node.id, waiting: true, reason: 'No file event yet' } };
            }
            if (inbound.nodeId !== node.id || String(inbound.transport || '') !== 'watch') {
                return { success: true, data: { nodeId: node.id, matched: false, reason: 'File event belongs to another listener' } };
            }
            return {
                success: true,
                data: {
                    nodeId: node.id,
                    matched: true,
                    transport: 'watch',
                    event: inbound.event,
                    path: inbound.path,
                    payload: inbound.payload ?? inbound.data,
                    meta: { path: inbound.path, event: inbound.event }
                }
            };
        }
        case 'tail': {
            const inbound = (context as any).inbound;
            if (!inbound) {
                return { success: true, data: { nodeId: node.id, waiting: true, reason: 'No file line yet' } };
            }
            if (inbound.nodeId !== node.id || String(inbound.transport || '') !== 'tail') {
                return { success: true, data: { nodeId: node.id, matched: false, reason: 'File line belongs to another listener' } };
            }
            return {
                success: true,
                data: {
                    nodeId: node.id,
                    matched: true,
                    transport: 'tail',
                    path: inbound.path,
                    payload: inbound.payload ?? inbound.data,
                    line: inbound.payload ?? inbound.data,
                    meta: { path: inbound.path }
                }
            };
        }
        case 'global-config':
        case 'mqtt':
        case 'websocket':
        case 'tls': {
            // Config node: it only carries settings for other nodes.
            return {
                success: true,
                data: {
                    nodeId: node.id,
                    config: true,
                    skipped: true,
                    reason: `${node.type} config is consumed by other nodes`
                }
            };
        }
        case 'mqtt-out': {
            const publish = (context as any).mqttPublish;
            let settings: WorkflowMqttSettings;
            try {
                settings = await resolveMqttConfig(config, context);
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id } };
            }
            const url = settings.url;
            const topic = settings.topic;
            if (typeof publish !== 'function') {
                return {
                    success: false,
                    error: new Error(
                        'MQTT publishing requires a workflow host with broker access. '
                        + 'Run the workflow with `tsdi-agent serve` or inject a publisher.'
                    ),
                    data: { nodeId: node.id }
                };
            }
            if (!url || !topic) {
                return {
                    success: false,
                    error: new Error('MQTT out needs a broker URL and a topic.'),
                    data: { nodeId: node.id }
                };
            }
            const value = resolveWorkflowValue(config.payload === undefined ? 'payload' : config.payload, context);
            const payload = typeof value === 'string' ? value : JSON.stringify(value ?? null);
            await publish({
                url,
                topic,
                payload,
                qos: settings.qos,
                retain: config.retain === true,
                clientId: settings.clientId,
                username: settings.username,
                password: settings.password,
                keepalive: settings.keepalive,
                clean: settings.clean,
                will: settings.will,
                tls: settings.tls
            });
            return {
                success: true,
                data: { nodeId: node.id, published: true, topic, payload }
            };
        }
        case 'http-response': {
            const sink = (context as any).response;
            if (!sink || typeof sink !== 'object') {
                return {
                    success: true,
                    data: { nodeId: node.id, skipped: true, reason: 'No HTTP response sink' }
                };
            }
            const bodyPath = String(config.body ?? 'payload');
            const body = bodyPath ? resolveWorkflowValue(bodyPath, context) : undefined;
            const statusCode = Math.max(100, Math.min(599, Number(config.statusCode) || 200));
            sink.statusCode = statusCode;
            // Merge so http-in default headers survive; the response node wins.
            sink.headers = {
                ...(sink.headers && typeof sink.headers === 'object' ? sink.headers : {}),
                ...(coerceJson(config.headers) || {})
            };
            sink.body = body;
            return {
                success: true,
                data: { nodeId: node.id, responded: true, statusCode }
            };
        }
        case 'trigger': {
            const delay = Math.max(0, Number(config.delay) || 0);
            const state = extras?.nodeState || {};
            const mode = String(config.newMessage || 'parallel');
            const resetVersion = Number(state.triggerResetVersion) || 0;
            if (resolveWorkflowValue('reset', context) === true) {
                state.triggerResetVersion = resetVersion + 1;
                state.triggerGeneration = (Number(state.triggerGeneration) || 0) + 1;
                state.triggerDeadline = 0;
                return {
                    success: true,
                    data: { nodeId: node.id, dropped: true, reset: true, triggered: false }
                };
            }
            const generation = (Number(state.triggerGeneration) || 0) + 1;
            state.triggerGeneration = generation;
            let deadline = Date.now() + delay;
            if (mode === 'extend') {
                const existing = Number(state.triggerDeadline) || 0;
                if (existing > Date.now()) {
                    deadline = existing + delay;
                }
                state.triggerDeadline = deadline;
            }
            let superseded = false;
            let reset = false;
            const stopped = !(await pause(Math.max(0, deadline - Date.now()), () => {
                if (extras?.cancelled?.()) {
                    return true;
                }
                if ((Number(state.triggerResetVersion) || 0) !== resetVersion) {
                    reset = true;
                    superseded = true;
                    return true;
                }
                if ((mode === 'restart' || mode === 'extend') && Number(state.triggerGeneration) !== generation) {
                    superseded = true;
                    return true;
                }
                return false;
            }));
            if (stopped) {
                if (superseded) {
                    return {
                        success: true,
                        data: { nodeId: node.id, dropped: true, superseded: true, reset, triggered: false }
                    };
                }
                return { success: false, error: new Error('Workflow cancelled'), data: { nodeId: node.id } };
            }
            const payload = coerceJson(config.payload ?? {});
            if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
                return {
                    success: true,
                    data: { ...payload, payload, nodeId: node.id, triggered: true }
                };
            }
            return { success: true, data: { nodeId: node.id, triggered: true, payload } };
        }
        case 'function': {
            try {
                const source = String(config.code || 'return input;');
                const msg = (context as any).msg || { payload: (context as any).payload };
                const flow = (context as any).flow || {};
                const global = (context as any).global || {};
                const env = (context as any).env || {};
                const run = async (code: string) => {
                    // Trusted-code node: same trust level as a Node-RED function node.
                    const fn = new Function(
                        'context',
                        'input',
                        'msg',
                        'flow',
                        'global',
                        'env',
                        `"use strict"; return (async () => { ${code}\n })();`
                    ) as (ctx: any, input: any, msg: any, flow: any, global: any, env: any) => Promise<any>;
                    const value = await fn(context, context, msg, flow, global, env);
                    // Function nodes may mutate msg directly; keep the branch
                    // context payload/topic in sync before the next node runs.
                    (context as any).msg = msg;
                    (context as any).payload = msg.payload;
                    return value;
                };
                if (String(config.initialize || '').trim()) {
                    const initial = await run(String(config.initialize));
                    if (initial && typeof initial === 'object' && !Array.isArray(initial)) {
                        Object.assign(context, initial);
                    }
                }
                const value = await run(source);
                if (String(config.finalize || '').trim()) {
                    const finalized = await run(String(config.finalize));
                    if (finalized && typeof finalized === 'object' && !Array.isArray(finalized)) {
                        Object.assign(context, finalized);
                    }
                }
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    const isMessage = 'payload' in value
                        || 'topic' in value
                        || 'parts' in value
                        || 'meta' in value;
                    return {
                        success: true,
                        data: { ...value, nodeId: node.id, ...(isMessage ? { msg: value } : {}) }
                    };
                }
                return { success: true, data: { nodeId: node.id, result: value } };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id } };
            }
        }
        case 'template': {
            const template = String(config.template ?? '');
            const syntax = String(config.syntax || 'mustache');
            const rendered = syntax === 'plain' ? template : templateText(template, context);
            const output = String(config.output || 'text');
            let text: any = rendered;
            if (output === 'json') {
                try {
                    text = rendered.trim() ? JSON.parse(rendered) : null;
                } catch (error) {
                    return {
                        success: false,
                        error: new Error(`Invalid JSON template output: ${(error as Error).message}`),
                        data: { nodeId: node.id }
                    };
                }
            } else if (output === 'yaml') {
                try {
                    text = rendered.trim() ? parseYaml(rendered) : null;
                } catch (error) {
                    return {
                        success: false,
                        error: new Error(`Invalid YAML template output: ${(error as Error).message}`),
                        data: { nodeId: node.id }
                    };
                }
            }
            const target = String(config.target || 'message');
            return { success: true, data: { nodeId: node.id, [target]: text, value: text } };
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
                const columns = String(config.columns || '').split(',').map(item => item.trim()).filter(Boolean);
                if (String(config.mode || 'parse') === 'stringify') {
                    const rows = columns.length && Array.isArray(source)
                        ? source.map(item => Object.fromEntries(columns.map(column => [column, item?.[column]])))
                        : source;
                    const value = stringifyCsv(rows, delimiter);
                    return { success: true, data: { nodeId: node.id, value } };
                }
                let value = parseCsv(String(source ?? ''), delimiter, config.header !== false);
                if (columns.length) {
                    value = (value as any[]).map((row: any) => Object.fromEntries(columns.map(column => [column, row?.[column]])));
                }
                if (config.parseNumbers === true) {
                    const toNumber = (cell: any): any => {
                        if (typeof cell !== 'string') {
                            return cell;
                        }
                        const text = cell.trim();
                        return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : cell;
                    };
                    value = (value as any[]).map((row: any) => Array.isArray(row)
                        ? row.map(toNumber)
                        : Object.fromEntries(Object.entries(row).map(([key, cell]) => [key, toNumber(cell)])));
                }
                return { success: true, data: { nodeId: node.id, value, items: value, count: value.length } };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id } };
            }
        }
        case 'change': {
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
                    if (valueFrom === 'msg') {
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
            const rawArgs = config.args;
            const args = Array.isArray(rawArgs)
                ? rawArgs.map(item => item && typeof item === 'object' && 'value' in item ? item.value : item)
                : coerceJson(rawArgs);
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
                return compareValues(actual, String(config.operator || 'truthy'), resolveCompareValue(config.value, context));
            });
            return { success: true, data: { nodeId: node.id, items: filtered, count: filtered.length } };
        }
        case 'sort': {
            const items = arrayFrom(context, config.field).slice();
            const direction = String(config.order || 'asc') === 'desc' ? -1 : 1;
            const numeric = config.numeric === true;
            items.sort((a, b) => {
                const av = resolveFrom(a, config.path);
                const bv = resolveFrom(b, config.path);
                if (numeric) {
                    return (Number(av) - Number(bv)) * direction;
                }
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
        case 'combine': {
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
        }
        case 'rbe': {
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
        }
        case 'batch': {
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
        case 'junction':
        case 'sequence':
            return { success: true, data: { nodeId: node.id } };
        case 'switch':
        case 'router': {
            const actual = resolveWorkflowValue(config.field, context);
            const rules = Array.isArray(config.rules) ? config.rules : [];
            const checkAll = config.checkAll === true;
            const routes: number[] = [];
            let matchedAny = false;
            for (let index = 0; index < rules.length && index < 8; index++) {
                const operator = String(rules[index]?.operator || 'equals');
                const matched = operator === 'else'
                    ? !matchedAny
                    : matchRouterRule(actual, operator, resolveCompareValue(rules[index]?.value, context));
                if (!matched) {
                    continue;
                }
                matchedAny = true;
                if (!checkAll) {
                    return { success: true, data: { nodeId: node.id, route: index + 1, value: actual } };
                }
                routes.push(index + 1);
            }
            if (checkAll) {
                return {
                    success: true,
                    data: { nodeId: node.id, routes, route: routes[0] || 0, value: actual }
                };
            }
            return { success: true, data: { nodeId: node.id, route: 0, value: actual } };
        }
        case 'link':
            return {
                success: true,
                data: {
                    nodeId: node.id,
                    mode: String(config.mode || 'out'),
                    links: String(config.links || '').split(',').map(item => item.trim()).filter(Boolean),
                    timeout: Math.max(0, Number(config.timeout) || 0)
                }
            };
        case 'scale': {
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
            if (config.clamp !== false) {
                const low = Math.min(outMin, outMax);
                const high = Math.max(outMin, outMax);
                scaled = Math.min(high, Math.max(low, scaled));
            }
            if (config.round === true) {
                scaled = Math.round(scaled);
            }
            const target = String(config.target || 'value');
            return { success: true, data: { nodeId: node.id, [target]: scaled, value: scaled } };
        }
        case 'html': {
            const source = String(resolveWorkflowValue(config.field || 'value', context) ?? '');
            const mode = String(config.mode || 'text');
            const tag = String(config.tag || '').trim();
            let segments: string[] = [];
            if (tag) {
                const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
                let match: RegExpExecArray | null;
                while ((match = pattern.exec(source))) {
                    segments.push(match[1]);
                }
            }
            const content = tag ? segments : [source];
            const values = content.map(part => {
                if (mode === 'links') {
                    return htmlLinks(part);
                }
                if (mode === 'attribute') {
                    return htmlAttributes(part, String(config.attribute || 'href'));
                }
                return stripHtml(part);
            });
            const value = tag
                ? (values.length <= 1 ? (values[0] || (mode === 'links' ? [] : '')) : values)
                : values[0];
            const target = String(config.target || 'value');
            return { success: true, data: { nodeId: node.id, [target]: value, value } };
        }
        case 'yaml': {
            const source = resolveWorkflowValue(config.field || 'value', context);
            const target = String(config.target || 'value');
            try {
                const value = String(config.mode || 'parse') === 'stringify'
                    ? stringifyYaml(source)
                    : parseYaml(String(source ?? ''));
                return { success: true, data: { nodeId: node.id, [target]: value, value } };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id } };
            }
        }
        case 'xml': {
            const source = resolveWorkflowValue(config.field || 'value', context);
            const mode = String(config.mode || 'parse');
            const target = String(config.target || 'value');
            try {
                if (mode === 'stringify') {
                    const value = typeof source === 'string' ? JSON.parse(source) : source;
                    const name = Object.keys(value || {})[0] || 'root';
                    const xml = serializeXmlValue(name, value?.[name], config.pretty === true).trim();
                    return { success: true, data: { nodeId: node.id, [target]: xml, value: xml } };
                }
                const value = pruneXmlValue(
                    parseXmlDocument(String(source ?? '')),
                    config.attributes !== false,
                    config.text !== false
                );
                return { success: true, data: { nodeId: node.id, [target]: value, value } };
            } catch (error) {
                return { success: false, error: error as Error, data: { nodeId: node.id } };
            }
        }
        case 'parallel':
            return { success: true, data: { nodeId: node.id, parallel: true } };
        case 'join': {
            const incoming = extras?.incoming || [];
            const ignoreEmpty = config.ignoreEmpty !== false;
            const values = incoming
                .filter(input => !ignoreEmpty || (input.result?.data !== undefined && input.result?.data !== null))
                .map(input => input.result?.data);
            const target = String(config.resultField || 'joined');
            const mode = String(config.mode || 'array');
            let value: any;
            if (mode === 'count') {
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
        case 'trycatch':
            return { success: true, data: { nodeId: node.id, guarded: true } };
        case 'subprocess': {
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
        case 'custom':
        default:
            if (config.execute && typeof config.execute === 'function') {
                return { success: true, data: { nodeId: node.id, result: await config.execute(context) } };
            }
            if (node.requiresServer) {
                return {
                    success: false,
                    error: new Error(`Node type "${node.type}" requires an installed workflow plugin on the execution host.`),
                    data: { nodeId: node.id, type: node.type, pluginId: node.pluginId }
                };
            }
            return {
                success: true,
                data: { nodeId: node.id, type: node.type, result: coerceJson(config.result) }
            };
    }
}

/**
 * Structural validation for persisted drafts.
 *
 * Incomplete documents (no start node, empty canvas, unfinished connections)
 * are valid drafts: the editor autosaves them and validates runnability when
 * the user actually runs the workflow.
 */
export function validateVisualWorkflowDraft(definition: VisualWorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!definition?.id) {
        errors.push('Workflow ID is required');
    }
    if (!definition?.name) {
        errors.push('Workflow name is required');
    }
    if (!Array.isArray(definition?.nodes)) {
        errors.push('Workflow nodes must be an array');
    }
    if (!Array.isArray(definition?.connections)) {
        errors.push('Workflow connections must be an array');
    }
    return { valid: errors.length === 0, errors };
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

    // Start/end nodes are optional Node-RED style helpers. Any trigger or
    // orphan node can be an entry point, so no start-node requirement here.

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

/**
 * Node-RED style entry points: explicit `start`/`inject` triggers first, then
 * every node without an incoming connection. Start/end nodes are optional;
 * any trigger or orphan node can begin a flow, and several entries can run in
 * sequence.
 */
export function findWorkflowEntryNodes(definition: VisualWorkflowDefinition): IVisualWorkflowNode[] {
    const nodes = definition?.nodes || [];
    const incoming = new Set((definition?.connections || []).map(connection => connection.targetNodeId));
    const entries: IVisualWorkflowNode[] = [];
    const push = (node: IVisualWorkflowNode) => {
        if (!entries.includes(node)) {
            entries.push(node);
        }
    };
    const lifecycle = new Set(['complete', 'catch', 'status']);
    // Link-in nodes are reached through their matching link-out nodes (or not
    // at all); they must never start a flow on their own.
    const isLinkIn = (node: IVisualWorkflowNode) =>
        node.type === 'link' && String(node.config?.mode || 'out') === 'in';
    nodes.filter(node => node.type === 'start').forEach(push);
    nodes.filter(node => node.type === 'inject').forEach(push);
    nodes.filter(node =>
        !lifecycle.has(node.type) && !incoming.has(node.id) && !isLinkIn(node)
    ).forEach(push);
    return entries;
}

export function findWorkflowStartNode(definition: VisualWorkflowDefinition): IVisualWorkflowNode | undefined {
    return findWorkflowEntryNodes(definition)[0];
}

export function outgoingConnections(
    definition: VisualWorkflowDefinition,
    nodeId: string
): NodeConnection[] {
    return (definition.connections || []).filter(connection => connection.sourceNodeId === nodeId);
}
