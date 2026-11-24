import type { ActivityContext } from '../../activities/Activity';
import { coerceJson, resolveCredentialValue } from './values';

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





/**
 * Resolve a typed compare value. Typed value fields store references and
 * literal classes explicitly; older documents keep the `msg.` / `flow.` /
 * `global.` / `env.` prefix form and plain strings stay literal so existing
 * rules keep comparing text.
 */

/** Async compare values: expression sources need the evaluator. */
