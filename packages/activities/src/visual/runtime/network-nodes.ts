import type { ActivityContext, ActivityResult } from '../../activities/Activity';
import type { IVisualWorkflowNode } from '../types';
import {
    coerceJson,
    resolveCredentialValue,
    resolveWorkflowValue,
    resolveWorkflowValueAsync
} from './values';
import { parsePayloadText } from './parsers';
import {
    resolveMqttConfig,
    resolveTcpConfig,
    resolveUdpConfig,
    resolveWebSocketClientConfig,
    resolveWebSocketListenerConfig
} from './network-config';
import type { WorkflowMqttSettings } from './network-config';
import { resolveWorkflowMarkersAsync } from '../workflow-typed-value';

/**
 * Network, file and config-node bodies. The runtime switch only delegates; the
 * cases keep their original results and status keys so hosts and tests observe
 * the same payloads.
 */

export async function httpInNode(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
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

export async function inboundNode(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
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

export async function transportOutNode(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
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

export async function fileInNode(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
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

export async function fileOutNode(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
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

export async function watchNode(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
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

export async function tailNode(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
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

export async function configNode(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
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

export async function mqttOutNode(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
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

export async function httpResponseNode(node: IVisualWorkflowNode, context: ActivityContext): Promise<ActivityResult> {
    const config = node.config || {};
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
