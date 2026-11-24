import { parseYaml, stringifyYaml } from './workflow-yaml';
import { getWorkflowNodeHandler } from './runtime/workflow-node-handlers';
import './runtime/control-handlers';
import './runtime/handlers/parsers';
import './runtime/handlers/data';
import {
    coerceJson,
    compareValues,
    resolveCompareValue,
    resolveCompareValueAsync,
    resolveCredentialValue,
    resolveWorkflowValue,
    resolveWorkflowValueAsync
} from './runtime/values';
import { evaluateWorkflowExpression } from './workflow-expression';
import { Activity, ActivityContext, ActivityNodeStatus, ActivityResult } from '../activities/Activity';
import {
    isWorkflowValueRef,
    readWorkflowProperty as resolveFrom,
    resolveWorkflowTypedValue,
    resolveWorkflowTypedValueAsync,
    workflowExpressionMarkers,
    resolveWorkflowExpressionMarkers,
    resolveWorkflowMarkersAsync
} from './workflow-typed-value';
import {
    IVisualWorkflowNode,
    NodeConnection,
    VisualWorkflowDefinition
} from './types';

export { resolveCredentialValue, resolveWorkflowValue } from './runtime/values';

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
    birth?: { topic: string; payload: string; qos?: number; retain?: boolean };
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
    const birthTopic = String(await resolveCredentialValue(pick('birthTopic'), context) ?? '').trim();
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
                qos: Math.max(0, Math.min(2, Number(pick('willQos')) || 0)),
                retain: pick('willRetain') === true || pick('willRetain') === 'true'
            }
            : undefined,
        birth: birthTopic
            ? {
                topic: birthTopic,
                payload: String(await resolveCredentialValue(pick('birthPayload'), context) ?? ''),
                qos: Math.max(0, Math.min(2, Number(pick('birthQos')) || 0)),
                retain: pick('birthRetain') === true || pick('birthRetain') === 'true'
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
    subprotocol?: string;
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
    const subprotocol = String(pick('subprotocol') || '').trim();
    const tlsId = String(pick('tls') || '').trim();
    return {
        host,
        port,
        path: pathValue || undefined,
        subprotocol: subprotocol || undefined,
        tls: tlsId ? await resolveTlsOptions({ tls: tlsId }, context) : undefined,
        listenerId: listenerId || undefined
    };
}

/** Resolved shared HTTP endpoint used by `http-request`. */
export interface WorkflowHttpEndpointSettings {
    baseUrl?: string;
    headers: Record<string, any>;
    query: Record<string, any>;
    followRedirects: boolean;
    ignoreErrors: boolean;
    authType: string;
    username?: string;
    password?: string;
    token?: string;
    apiKeyHeader?: string;
    apiKey?: string;
    endpointId?: string;
}

/**
 * Resolve a shared `http` endpoint config node. Only a selected endpoint is
 * used here; node-level URL/headers/auth stay on the node and are merged by
 * the HTTP request executor.
 */
export async function resolveHttpConfig(
    config: Record<string, any>,
    context: ActivityContext
): Promise<WorkflowHttpEndpointSettings> {
    const endpointId = String(config?.http || '').trim();
    const nodes = (context as any)?.configNodes || {};
    const shared = endpointId ? nodes[endpointId] : undefined;
    if (endpointId && !shared) {
        throw new Error(`HTTP endpoint not found: ${endpointId}. Add an HTTP endpoint config node or clear the reference.`);
    }
    if (!shared) {
        return { headers: {}, query: {}, followRedirects: true, ignoreErrors: false, authType: 'none' };
    }
    const read = async (value: any) => {
        const resolved = await resolveCredentialValue(value, context);
        return resolved === undefined || resolved === null || resolved === '' ? undefined : String(resolved);
    };
    const headers = coerceJson(shared.headers);
    const query = coerceJson(shared.query);
    return {
        baseUrl: String(shared.baseUrl || '').trim() || undefined,
        headers: headers && typeof headers === 'object' && !Array.isArray(headers) ? headers : {},
        query: query && typeof query === 'object' && !Array.isArray(query) ? query : {},
        followRedirects: shared.followRedirects !== false,
        ignoreErrors: shared.ignoreErrors === true,
        authType: String(shared.authType || 'none'),
        username: await read(shared.username),
        password: await read(shared.password),
        token: await read(shared.token),
        apiKeyHeader: String(shared.apiKeyHeader || 'x-api-key'),
        apiKey: await read(shared.apiKey),
        endpointId
    };
}

/** Resolved TCP endpoint used by `tcp-in` / `tcp-out`. */
export interface WorkflowTcpSettings {
    host: string;
    port: number;
    tls?: { ca?: string; cert?: string; key?: string; servername?: string; rejectUnauthorized?: boolean };
    endpointId?: string;
}

/** Resolved UDP endpoint used by `udp-in` / `udp-out`. */
export interface WorkflowUdpSettings {
    host: string;
    port: number;
    broadcast: boolean;
    endpointId?: string;
}

/**
 * Resolve a shared `tcp` endpoint config node. Inline node values win so a
 * node can override the shared host/port/TLS without editing the config.
 */
export async function resolveTcpConfig(
    config: Record<string, any>,
    context: ActivityContext
): Promise<WorkflowTcpSettings> {
    const endpointId = String(config?.tcp || '').trim();
    const nodes = (context as any)?.configNodes || {};
    const shared = endpointId ? nodes[endpointId] : undefined;
    if (endpointId && !shared) {
        throw new Error(`TCP endpoint not found: ${endpointId}. Add a TCP endpoint config node or clear the reference.`);
    }
    const pick = (key: string): any => {
        const value = shared?.[key];
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
        return config?.[key];
    };
    const host = String(await resolveCredentialValue(pick('host'), context) ?? '').trim() || '0.0.0.0';
    const port = Math.max(0, Math.min(65535, Number(pick('port')) || 0));
    const tlsId = String(pick('tls') || '').trim();
    return {
        host,
        port,
        tls: tlsId ? await resolveTlsOptions({ tls: tlsId }, context) : undefined,
        endpointId: endpointId || undefined
    };
}

/** Resolve a shared `udp` endpoint config node (inline values win). */
export async function resolveUdpConfig(
    config: Record<string, any>,
    context: ActivityContext
): Promise<WorkflowUdpSettings> {
    const endpointId = String(config?.udp || '').trim();
    const nodes = (context as any)?.configNodes || {};
    const shared = endpointId ? nodes[endpointId] : undefined;
    if (endpointId && !shared) {
        throw new Error(`UDP endpoint not found: ${endpointId}. Add a UDP endpoint config node or clear the reference.`);
    }
    const pick = (key: string): any => {
        const value = shared?.[key];
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
        return config?.[key];
    };
    return {
        host: String(await resolveCredentialValue(pick('host'), context) ?? '').trim() || '0.0.0.0',
        port: Math.max(0, Math.min(65535, Number(pick('port')) || 0)),
        broadcast: pick('broadcast') === true || pick('broadcast') === 'true',
        endpointId: endpointId || undefined
    };
}

/** Resolved WebSocket client endpoint. */
export interface WorkflowWebSocketClientSettings {
    url: string;
    headers?: Record<string, string>;
    subprotocol?: string;
    tls?: { ca?: string; cert?: string; key?: string; servername?: string; rejectUnauthorized?: boolean };
    clientId?: string;
}

/** Resolve a shared `websocket-client` endpoint (inline values when no ref). */
export async function resolveWebSocketClientConfig(
    config: Record<string, any>,
    context: ActivityContext
): Promise<WorkflowWebSocketClientSettings> {
    const clientId = String(config?.wsClient || config?.client || '').trim();
    const nodes = (context as any)?.configNodes || {};
    const shared = clientId ? nodes[clientId] : undefined;
    if (clientId && !shared) {
        throw new Error(`WebSocket client endpoint not found: ${clientId}. Add a websocket-client config node or clear the reference.`);
    }
    if (!shared) {
        const headers = coerceJson(config?.headers);
        return {
            url: String(await resolveCredentialValue(config?.url, context) ?? '').trim(),
            headers: headers && typeof headers === 'object' && !Array.isArray(headers) ? headers : undefined,
            subprotocol: String(config?.subprotocol || '').trim() || undefined,
            tls: config?.tls ? await resolveTlsOptions(config, context) : undefined
        };
    }
    const headers = coerceJson(shared.headers);
    return {
        url: String(await resolveCredentialValue(shared.url, context) ?? '').trim(),
        headers: headers && typeof headers === 'object' && !Array.isArray(headers) ? headers : undefined,
        subprotocol: String(shared.subprotocol || '').trim() || undefined,
        tls: shared.tls ? await resolveTlsOptions({ tls: shared.tls }, context) : undefined,
        clientId
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
 * Resolve a typed compare value. Typed value fields store references and
 * literal classes explicitly; older documents keep the `msg.` / `flow.` /
 * `global.` / `env.` prefix form and plain strings stay literal so existing
 * rules keep comparing text.
 */

/** Async compare values: expression sources need the evaluator. */


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

/** Request body: strings pass through, objects from expressions are JSON. */
async function resolveRequestBody(body: any, context: ActivityContext): Promise<string | undefined> {
    if (body === undefined || body === null || body === '') {
        return undefined;
    }
    const resolved = await resolveWorkflowValueAsync(body, context);
    if (resolved === undefined || resolved === null || resolved === '') {
        return undefined;
    }
    return typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved);
}

async function runHttp(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
    let endpoint: WorkflowHttpEndpointSettings;
    try {
        endpoint = await resolveHttpConfig(config, context);
    } catch (error) {
        return { success: false, error: error as Error, data: { nodeId: node.id } };
    }
    const resolvedUrl = await resolveWorkflowValueAsync(config.url, context);
    const rawUrl = typeof config.url === 'string' ? config.url.trim() : '';
    // Literal endpoints must not be mistaken for dotted context paths.
    let url = resolvedUrl || (/^[a-z][a-z0-9+.-]*:/i.test(rawUrl) ? rawUrl : resolvedUrl);
    if (endpoint.baseUrl) {
        if (rawUrl && /^[a-z][a-z0-9+.-]*:/i.test(rawUrl)) {
            url = rawUrl;
        } else if (rawUrl) {
            try {
                url = new URL(rawUrl, endpoint.baseUrl.endsWith('/') ? endpoint.baseUrl : `${endpoint.baseUrl}/`).toString();
            } catch {
                url = `${endpoint.baseUrl.replace(/\/$/, '')}/${rawUrl.replace(/^\//, '')}`;
            }
        } else {
            url = endpoint.baseUrl;
        }
    }
    if (url && endpoint.query && Object.keys(endpoint.query).length) {
        try {
            const parsed = new URL(String(url));
            Object.entries(endpoint.query).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    parsed.searchParams.set(key, String(value));
                }
            });
            url = parsed.toString();
        } catch {
            // Relative/unparseable URLs keep their original form.
        }
    }
    // Node-RED `paytoqs`: append an object payload to the URL as query
    // parameters instead of sending it as the body.
    if (config.paytoqs === true && url) {
        const payload = (context as any).msg?.payload ?? (context as any).payload;
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
            const search = Object.entries(payload)
                .filter(([, value]) => value !== undefined && value !== null)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
                .join('&');
            if (search) {
                url = `${url}${String(url).includes('?') ? '&' : '?'}${search}`;
            }
        }
    }
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
        const nodeHeaders = coerceJson(config.headers);
        const headers: Record<string, any> = {
            ...(endpoint.headers || {}),
            ...(nodeHeaders && typeof nodeHeaders === 'object' && !Array.isArray(nodeHeaders) ? nodeHeaders : {})
        };
        const authType = endpoint.endpointId ? endpoint.authType : String(config.authType || 'none');
        if (authType === 'basic') {
            const username = endpoint.endpointId
                ? String(endpoint.username ?? '')
                : String(await resolveCredentialValue(config.username, context) ?? '');
            const password = endpoint.endpointId
                ? String(endpoint.password ?? '')
                : String(await resolveCredentialValue(config.password, context) ?? '');
            const raw = `${username}:${password}`;
            const encoded = typeof btoa === 'function'
                ? btoa(raw)
                : (globalThis as any).Buffer?.from(raw).toString('base64') || '';
            headers.Authorization = `Basic ${encoded}`;
        } else if (authType === 'bearer') {
            const token = endpoint.endpointId
                ? String(endpoint.token ?? '')
                : String(await resolveCredentialValue(config.token, context) ?? '');
            headers.Authorization = `Bearer ${token}`;
        } else if (authType === 'apikey') {
            const header = endpoint.endpointId
                ? String(endpoint.apiKeyHeader || 'x-api-key')
                : String(config.apiKeyHeader || 'x-api-key');
            const key = endpoint.endpointId
                ? String(endpoint.apiKey ?? '')
                : String(await resolveCredentialValue(config.apiKey, context) ?? '');
            if (key) {
                headers[header] = key;
            }
        }
        const response = await fetchImpl(String(url), {
            method: String(config.method || 'GET').toUpperCase(),
            headers: Object.keys(headers).length ? headers : undefined,
            body: await resolveRequestBody(config.body, context),
            redirect: (endpoint.endpointId ? endpoint.followRedirects : config.followRedirects !== false) ? 'follow' : 'manual'
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
                        data: { nodeId: node.id, status: response.status },
                        status: {
                            text: `HTTP ${response.status} · invalid JSON`,
                            level: 'error',
                            key: 'workflow.nodeStatus.invalidJson',
                            params: { status: response.status }
                        }
                    };
                }
                body = text;
            }
        }
        const ignored = endpoint.endpointId ? endpoint.ignoreErrors : config.ignoreErrors === true;
        return {
            success: response.ok || ignored,
            error: response.ok || ignored ? undefined : new Error(`HTTP ${response.status}`),
            status: {
                text: `HTTP ${response.status}`,
                level: response.ok ? 'success' : ignored ? 'warn' : 'error',
                key: 'workflow.nodeStatus.http',
                params: { status: response.status }
            },
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
            data: { nodeId: node.id },
            status: { text: 'Request failed', level: 'error', key: 'workflow.nodeStatus.requestFailed' }
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

    // Registered handlers own their node family; the inline switch below is
    // the remaining migration surface (extracted family by family).
    const registered = getWorkflowNodeHandler(node.type);
    if (registered) {
        return registered({ node, context, host, extras });
    }

    switch (node.type) {
        case 'task':
            return runTask(node, context);
        case 'condition':
            return {
                success: true,
                data: { nodeId: node.id, condition: await evaluateConditionAsync(node, context) }
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
                    ? await resolveWorkflowValueAsync(field, context)
                    : await resolveWorkflowValueAsync(config.message, context);
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
            // Node-RED `tostatus`: mirror the message on the node itself.
            const showInStatus = node.type === 'debug' && config.tostatus === true && message;
            return {
                success: true,
                data: { nodeId: node.id, level, message },
                ...(showInStatus
                    ? {
                        status: {
                            text: message.length > 80 ? `${message.slice(0, 77)}…` : message,
                            level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'
                        }
                    }
                    : {})
            };
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
            } else if (payloadType === 'expression') {
                payload = await evaluateWorkflowExpression(String(config.payloadExpression ?? ''), context);
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
            // Properties can reference the payload being injected, so resolve
            // them against a context that already carries it.
            const propertyContext: any = {
                ...context,
                payload,
                msg: { ...((context as any).msg || {}), payload, ...(topic ? { topic } : {}) }
            };
            for (const rule of Array.isArray(config.properties) ? config.properties : []) {
                const key = String(rule?.key || '').trim();
                if (!key) {
                    continue;
                }
                const resolved = await resolveCompareValueAsync(rule.value, propertyContext);
                const value = typeof resolved === 'string' ? coerceJson(resolved) : resolved;
                const target = String(rule.target || 'msg');
                if (target === 'flow' || target === 'global') {
                    // Node-RED inject properties can write context stores.
                    const scope = target === 'flow' ? 'flow' : 'global';
                    const store = (context as any)[scope] || ((context as any)[scope] = {});
                    store[key] = value;
                    continue;
                }
                extra[key] = value;
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
                    qos: inbound.qos,
                    retain: inbound.retain,
                    payload: inbound.payload ?? inbound.data,
                    data: inbound.data,
                    remote: inbound.remote
                },
                status: {
                    text: [transport, inbound.topic || inbound.remote].filter(Boolean).join(' '),
                    level: 'info'
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
                    let settings;
                    try {
                        settings = await resolveWebSocketClientConfig(config, context);
                    } catch (error) {
                        return { success: false, error: error as Error, data: { nodeId: node.id } };
                    }
                    const url = settings.url;
                    if (!url) {
                        return {
                            success: false,
                            error: new Error(
                                'WebSocket out needs a ws:// or wss:// URL, or a shared WebSocket client/listener config.'
                            ),
                            data: { nodeId: node.id }
                        };
                    }
                    await sender({
                        url,
                        payload: body,
                        timeoutMs,
                        headers: settings.headers,
                        subprotocol: settings.subprotocol,
                        tls: settings.tls
                    });
                    return { success: true, data: { nodeId: node.id, transport, url, bytes: body.length } };
                }
                const tcpSettings = transport === 'tcp' ? await resolveTcpConfig(config, context) : undefined;
                const udpSettings = transport === 'udp' ? await resolveUdpConfig(config, context) : undefined;
                const host = tcpSettings?.host || udpSettings?.host || '';
                const port = tcpSettings?.port || udpSettings?.port || 0;
                if (!host || !port) {
                    return {
                        success: false,
                        error: new Error(`${transport.toUpperCase()} out needs a host and a port.`),
                        data: { nodeId: node.id }
                    };
                }
                if (transport === 'udp') {
                    const broadcast = udpSettings?.broadcast === true;
                    await sender({ host, port, payload: body, timeoutMs, broadcast });
                    return {
                        success: true,
                        data: {
                            nodeId: node.id,
                            transport,
                            host,
                            port,
                            broadcast,
                            bytes: body.length
                        }
                    };
                }
                await sender({ host, port, payload: body, timeoutMs, tls: tcpSettings?.tls });
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
                qos: Number(settings.qos) || 0,
                retain: config.retain === true,
                clientId: settings.clientId,
                username: settings.username,
                password: settings.password,
                keepalive: settings.keepalive,
                clean: settings.clean,
                will: settings.will,
                birth: settings.birth,
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
            const body = bodyPath ? await resolveWorkflowValueAsync(bodyPath, context) : undefined;
            const statusCode = Math.max(100, Math.min(599, Number(config.statusCode) || 200));
            sink.statusCode = statusCode;
            // Merge so http-in default headers survive; the response node wins.
            sink.headers = {
                ...(sink.headers && typeof sink.headers === 'object' ? sink.headers : {}),
                ...(await resolveWorkflowMarkersAsync(coerceJson(config.headers) || {}, context))
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
            // Node-RED `node.status`/`node.warn`/... helpers captured by the
            // sandbox and attached to the result.
            let pendingStatus: ActivityNodeStatus | undefined;
            const setStatus = (text: any, level: ActivityNodeStatus['level'] = 'info'): void => {
                const value = String(text ?? '').trim();
                if (!value) {
                    return;
                }
                pendingStatus = {
                    text: value.length > 80 ? `${value.slice(0, 77)}…` : value,
                    level
                };
            };
            const logger = (context as any).logger;
            /** Node-RED style `flow.get/set` on the shared scope objects. */
            const scoped = (target: Record<string, any>) => new Proxy(target, {
                get(store, key) {
                    if (key === 'get') {
                        return (name: string, fallback?: any) =>
                            store[name as any] === undefined ? fallback : store[name as any];
                    }
                    if (key === 'set') {
                        return (name: string, value: any) => {
                            store[name as any] = value;
                            return value;
                        };
                    }
                    return store[key as any];
                },
                set(store, key, value) {
                    store[key as any] = value;
                    return true;
                }
            });
            /** Messages passed to `node.send`; DAG runs forward one result. */
            const sent: any[] = [];
            const nodeApi = {
                id: node.id,
                name: node.name,
                send: (value: any) => {
                    sent.push(value);
                    return nodeApi;
                },
                status: (value: any) => {
                    if (value && typeof value === 'object') {
                        const level = String(value.level || 'info');
                        setStatus(value.text, level === 'success' || level === 'warn' || level === 'error'
                            ? level
                            : 'info');
                    } else {
                        setStatus(value);
                    }
                    return nodeApi;
                },
                info: (message: any) => {
                    logger?.info?.(String(message));
                    setStatus(message, 'info');
                },
                warn: (message: any) => {
                    logger?.warn?.(String(message));
                    setStatus(message, 'warn');
                },
                debug: (message: any) => {
                    logger?.debug?.(String(message));
                },
                error: (message: any) => {
                    logger?.error?.(String(message));
                    setStatus(message, 'error');
                    throw new Error(String(message));
                }
            };
            try {
                const source = String(config.code || 'return input;');
                const msg = (context as any).msg || { payload: (context as any).payload };
                const flow = scoped((context as any).flow || {});
                const global = scoped((context as any).global || {});
                // `env` already carries non-enumerable get/has helpers from the
                // service environment scope.
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
                        'node',
                        `"use strict"; return (async () => { ${code}\n })();`
                    ) as (
                        ctx: any, input: any, msg: any, flow: any, global: any, env: any, nodeApi: any
                    ) => Promise<any>;
                    const value = await fn(context, context, msg, flow, global, env, nodeApi);
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
                let value = await run(source);
                if ((value === undefined || value === null) && sent.length) {
                    // `node.send(msg)` without a return keeps the last message.
                    value = sent[sent.length - 1];
                }
                if (String(config.finalize || '').trim()) {
                    const finalized = await run(String(config.finalize));
                    if (finalized && typeof finalized === 'object' && !Array.isArray(finalized)) {
                        Object.assign(context, finalized);
                    }
                }
                const outputCount = Math.max(1, Math.min(8, Number(config.outputs) || 1));
                if (outputCount > 1 && Array.isArray(value)) {
                    // Multi-output: one message per port (`out`, `out-2`, ...).
                    const ids = ['out', ...Array.from({ length: outputCount - 1 }, (_, index) => `out-${index + 2}`)];
                    const messages: Record<string, any> = {};
                    value.slice(0, outputCount).forEach((item: any, index: number) => {
                        if (item !== undefined && item !== null) {
                            messages[ids[index]] = item;
                        }
                    });
                    return {
                        success: true,
                        data: { nodeId: node.id, outputs: value, messages },
                        ...(pendingStatus ? { status: pendingStatus } : {})
                    };
                }
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    const isMessage = 'payload' in value
                        || 'topic' in value
                        || 'parts' in value
                        || 'meta' in value;
                    return {
                        success: true,
                        data: { ...value, nodeId: node.id, ...(isMessage ? { msg: value } : {}) },
                        ...(pendingStatus ? { status: pendingStatus } : {})
                    };
                }
                return {
                    success: true,
                    data: { nodeId: node.id, result: value },
                    ...(pendingStatus ? { status: pendingStatus } : {})
                };
            } catch (error) {
                return {
                    success: false,
                    error: error as Error,
                    data: { nodeId: node.id },
                    ...(pendingStatus ? { status: pendingStatus } : {})
                };
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





        case 'event-emit': {
            const event = String(config.event || 'workflow.event');
            const payload = await resolveWorkflowMarkersAsync(coerceJson(config.payload), context);
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










        case 'switch':
        case 'router': {
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




        case 'join': {
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
