import * as dgram from 'node:dgram';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import * as tls from 'node:tls';
import { ActivityContext, ActivityResult } from '../src/activities/Activity';
import { VisualWorkflowDefinition, WorkflowExecutionOptions } from '../src/visual/types';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { sharedMqttRegistry, WorkflowMqttRegistry } from './WorkflowMqtt';
import { resolveMqttConfig, resolveTcpConfig, resolveUdpConfig, resolveWebSocketListenerConfig } from '../src/visual/workflow-runtime';
import { sharedWebSocketRegistry, WorkflowWebSocketRegistry } from './WorkflowWebSocket';
import { configNodeMap } from '../src/visual/VisualWorkflowService';

/** Message delivered to a `tcp-in` / `udp-in` node through `context.inbound`. */
export interface WorkflowInboundMessage {
    nodeId: string;
    transport: 'tcp' | 'udp' | 'websocket' | 'mqtt' | 'watch' | 'tail';
    data: string;
    /** MQTT topic the message arrived on. */
    topic?: string;
    /** File/folder path reported by `watch`. */
    path?: string;
    /** `watch` event type (`rename` or `change`). */
    event?: string;
    remote?: { address?: string; port?: number };
}

export interface WorkflowInboundOptions {
    /** Override the listen host for every inbound node. */
    host?: string;
    /** Base context merged into each run. */
    context?: ActivityContext;
    /** Execution options such as timeout or checkpoints. */
    execution?: WorkflowExecutionOptions;
    onResult?: (result: ActivityResult, message: WorkflowInboundMessage) => void;
    onError?: (error: Error, message?: WorkflowInboundMessage) => void;
    /** Config nodes (`mqtt`, `tls`) from the workflow definition. */
    configNodes?: Record<string, any>;
    /** Credential lookup for `{{credential:name}}` values in config nodes. */
    credentialResolver?: (name: string) => Promise<string | undefined> | string | undefined;
    /** Share one broker connection across listeners (defaults to the process registry). */
    mqttRegistry?: WorkflowMqttRegistry;
    /** Share one WebSocket listener across nodes (defaults to the process registry). */
    webSocketRegistry?: WorkflowWebSocketRegistry;
    /** Sandbox root for `watch` paths (falls back to context.workspaceRoot). */
    workspaceRoot?: string;
}

export interface WorkflowInboundHandle {
    readonly running: boolean;
    /** Bound ports in node order (`0` in config becomes the actual port). */
    readonly ports: number[];
    stop(): Promise<void>;
}

interface Listener {
    port: number;
    close(): Promise<void>;
}

function parsePayload(text: string): any {
    const trimmed = text.trim();
    if (!trimmed) {
        return text;
    }
    try {
        return JSON.parse(trimmed);
    } catch {
        return text;
    }
}

/**
 * The engine returns the entry node result; inbound replies are most useful
 * with the output of the latest node that actually produced data.
 */
function latestNodeData(result: ActivityResult): any {
    const nodeResults = (result.data as any)?.nodeResults as Record<string, ActivityResult> | undefined;
    const entries = nodeResults ? Object.values(nodeResults) : [];
    for (let index = entries.length - 1; index >= 0; index--) {
        const data = entries[index]?.data;
        if (data && data.waiting !== true) {
            return data;
        }
    }
    return result.data;
}

function listen(server: net.Server, host: string, port: number): Promise<number> {
    return new Promise((resolve, reject) => {
        const onError = (error: Error) => {
            server.close();
            reject(error);
        };
        server.once('error', onError);
        server.listen(port, host, () => {
            server.off('error', onError);
            const address = server.address();
            resolve(typeof address === 'object' && address ? address.port : port);
        });
    });
}

/**
 * Long-running inbound listeners for server hosts.
 *
 * Each `tcp-in` / `udp-in` node in the definition becomes a listener; every
 * received message starts one workflow run with `context.inbound` describing
 * the message. The runner is deliberately server-only: browser and TUI hosts
 * keep using the request/HTTP entry points.
 */
export class WorkflowInboundRunner {
    constructor(private readonly service: VisualWorkflowService) { }

    async start(
        definition: VisualWorkflowDefinition,
        options: WorkflowInboundOptions = {}
    ): Promise<WorkflowInboundHandle> {
        const listeners: Listener[] = [];
        const ports: number[] = [];
        const sockets = new Set<net.Socket>();
        let running = true;

        const dispatch = async (
            nodeId: string,
            transport: 'tcp' | 'udp' | 'websocket' | 'mqtt' | 'watch' | 'tail',
            data: string,
            remote: WorkflowInboundMessage['remote'],
            reply: ((payload: string) => void) | undefined,
            topic?: string,
            extra?: { path?: string; event?: string }
        ): Promise<void> => {
            if (!running) {
                return;
            }
            const message: WorkflowInboundMessage = {
                nodeId,
                transport,
                data,
                remote,
                ...(topic ? { topic } : {}),
                ...(extra?.path ? { path: extra.path } : {}),
                ...(extra?.event ? { event: extra.event } : {})
            };
            try {
                const result = await this.service.execute(
                    definition,
                    {
                        ...(options.context || {}),
                        inbound: { ...message, payload: parsePayload(data) }
                    },
                    options.execution
                );
                options.onResult?.(result, message);
                if (reply) {
                    reply(JSON.stringify(
                        result.success
                            ? latestNodeData(result) ?? { success: true }
                            : { success: false, error: result.error?.message }
                    ));
                }
            } catch (error) {
                options.onError?.(error as Error, message);
                if (reply) {
                    reply(JSON.stringify({ success: false, error: (error as Error).message }));
                }
            }
        };

        const mqttRegistry = options.mqttRegistry || sharedMqttRegistry;
        const webSocketRegistry = options.webSocketRegistry || sharedWebSocketRegistry;
        const configNodes = options.configNodes || configNodeMap(definition);
        const mqttUnsubscribes: Array<() => Promise<void>> = [];
        const watchers: fs.FSWatcher[] = [];
        const inboundNodes = (definition.nodes || []).filter(node =>
            node.type === 'tcp-in' || node.type === 'udp-in'
            || node.type === 'websocket-in' || node.type === 'mqtt-in'
            || node.type === 'watch' || node.type === 'tail'
        );

        for (const node of inboundNodes) {
            const config = node.config || {};
            const resolverContext = {
                configNodes,
                resolveCredential: options.credentialResolver
            } as any;
            let tcpSettings: Awaited<ReturnType<typeof resolveTcpConfig>> | undefined;
            let udpSettings: Awaited<ReturnType<typeof resolveUdpConfig>> | undefined;
            try {
                if (node.type === 'tcp-in') {
                    tcpSettings = await resolveTcpConfig(config, resolverContext);
                } else if (node.type === 'udp-in') {
                    udpSettings = await resolveUdpConfig(config, resolverContext);
                }
            } catch (error) {
                await this.stopListeners(listeners, sockets);
                throw error;
            }
            const host = String(options.host || tcpSettings?.host || udpSettings?.host || config.host || '0.0.0.0');
            const port = tcpSettings?.port ?? udpSettings?.port
                ?? Math.max(0, Math.min(65535, Number(config.port) || 0));
            const shouldReply = config.reply === true;

            if (node.type === 'tcp-in') {
                const onConnection = (socket: any) => {
                    sockets.add(socket);
                    socket.on('close', () => sockets.delete(socket));
                    socket.on('error', () => sockets.delete(socket));
                    socket.on('data', (chunk: any) => {
                        const remote = { address: socket.remoteAddress, port: socket.remotePort };
                        void dispatch(
                            node.id,
                            'tcp',
                            chunk.toString('utf8'),
                            remote,
                            shouldReply ? payload => {
                                if (!socket.destroyed) {
                                    socket.end(payload);
                                }
                            } : undefined
                        );
                    });
                };
                const tcpTls = tcpSettings?.tls;
                const server = tcpTls && (tcpTls.cert || tcpTls.key)
                    ? tls.createServer({
                        ca: tcpTls.ca,
                        cert: tcpTls.cert,
                        key: tcpTls.key
                    }, onConnection)
                    : net.createServer(onConnection);
                try {
                    const bound = await listen(server, host, port);
                    ports.push(bound);
                    listeners.push({
                        port: bound,
                        close: () => new Promise(resolve => server.close(() => resolve()))
                    });
                } catch (error) {
                    await this.stopListeners(listeners, sockets);
                    throw error;
                }
            } else if (node.type === 'mqtt-in') {
                let settings;
                try {
                    settings = await resolveMqttConfig(config, {
                        ...(options.context || {}),
                        configNodes,
                        resolveCredential: options.credentialResolver
                    } as any);
                } catch (error) {
                    await this.stopListeners(listeners, sockets);
                    for (const off of mqttUnsubscribes) {
                        await off().catch(() => undefined);
                    }
                    throw error;
                }
                if (!settings.url || !settings.topic) {
                    await this.stopListeners(listeners, sockets);
                    for (const off of mqttUnsubscribes) {
                        await off().catch(() => undefined);
                    }
                    throw new Error('MQTT in needs a broker URL and a topic.');
                }
                try {
                    // One broker subscription per topic; listeners sharing the
                    // same config reuse the connection and fan out here.
                    const off = await mqttRegistry.subscribe(settings, settings.topic, Math.max(0, Math.min(2, Number(settings.qos) || 0)) as 0 | 1 | 2, message => {
                        void dispatch(
                            node.id,
                            'mqtt',
                            message.payload,
                            undefined,
                            undefined,
                            message.topic
                        );
                    });
                    mqttUnsubscribes.push(off);
                } catch (error) {
                    await this.stopListeners(listeners, sockets);
                    for (const entry of mqttUnsubscribes) {
                        await entry().catch(() => undefined);
                    }
                    throw error;
                }
                listeners.push({
                    port: 0,
                    close: async () => {
                        const off = mqttUnsubscribes.shift();
                        if (off) {
                            await off();
                        }
                    }
                });
            } else if (node.type === 'watch') {
                const requested = String(config.path || '').trim();
                const workspaceRoot = String(
                    (options.context as any)?.workspaceRoot || options.workspaceRoot || process.cwd()
                );
                const target = path.isAbsolute(requested)
                    ? path.resolve(requested)
                    : path.resolve(workspaceRoot, requested);
                const relative = path.relative(path.resolve(workspaceRoot), target);
                if (requested && (relative.startsWith('..') || path.isAbsolute(relative))) {
                    await this.stopListeners(listeners, sockets);
                    for (const watcher of watchers) {
                        watcher.close();
                    }
                    throw new Error(
                        `Watch path "${requested}" is outside the allowed workspace root (${workspaceRoot}).`
                    );
                }
                if (!requested || !fs.existsSync(target)) {
                    await this.stopListeners(listeners, sockets);
                    for (const watcher of watchers) {
                        watcher.close();
                    }
                    throw new Error(`Watch path does not exist: ${target}.`);
                }
                const debounceMs = Math.max(0, Number(config.debounce) || 0);
                const wanted = String(config.event || 'all');
                const timers = new Map<string, any>();
                const watcher = fs.watch(target, { recursive: config.recursive === true }, (event, filename) => {
                    const eventName = String(event || 'change');
                    if (wanted !== 'all' && wanted !== eventName) {
                        return;
                    }
                    const reported = filename
                        ? path.resolve(target, String(filename))
                        : target;
                    const fire = () => {
                        timers.delete(reported);
                        void dispatch(
                            node.id,
                            'watch',
                            reported,
                            undefined,
                            undefined,
                            undefined,
                            { path: reported, event: eventName }
                        );
                    };
                    const existing = timers.get(reported);
                    if (existing) {
                        clearTimeout(existing);
                    }
                    timers.set(reported, setTimeout(fire, debounceMs));
                });
                watcher.on('error', error => {
                    options.onError?.(error as Error);
                });
                watchers.push(watcher);
                listeners.push({
                    port: 0,
                    close: async () => {
                        watcher.close();
                        for (const timer of timers.values()) {
                            clearTimeout(timer);
                        }
                        timers.clear();
                    }
                });
            } else if (node.type === 'tail') {
                const requested = String(config.path || '').trim();
                const workspaceRoot = String(
                    (options.context as any)?.workspaceRoot || options.workspaceRoot || process.cwd()
                );
                const target = path.isAbsolute(requested)
                    ? path.resolve(requested)
                    : path.resolve(workspaceRoot, requested);
                const relative = path.relative(path.resolve(workspaceRoot), target);
                if (!requested) {
                    await this.stopListeners(listeners, sockets);
                    throw new Error('Tail requires a file path.');
                }
                if (relative.startsWith('..') || path.isAbsolute(relative)) {
                    await this.stopListeners(listeners, sockets);
                    throw new Error(
                        `Tail path "${requested}" is outside the allowed workspace root (${workspaceRoot}).`
                    );
                }
                let initialSize = 0;
                try {
                    const stat = fs.statSync(target);
                    if (stat.isDirectory()) {
                        throw new Error(`Tail path is a directory: ${target}.`);
                    }
                    initialSize = stat.size;
                } catch (error) {
                    await this.stopListeners(listeners, sockets);
                    throw error instanceof Error && /directory/.test(error.message)
                        ? error
                        : new Error(`Tail file does not exist: ${target}.`);
                }
                const splitLines = config.split !== false;
                let position = initialSize;
                let pending = '';
                const emitLine = (line: string) => {
                    if (line === '') {
                        return;
                    }
                    void dispatch(
                        node.id,
                        'tail',
                        line,
                        undefined,
                        undefined,
                        undefined,
                        { path: target }
                    );
                };
                const emitChunk = (chunk: string) => {
                    if (!splitLines) {
                        emitLine(chunk);
                        return;
                    }
                    pending += chunk;
                    const lines = pending.split(/\r?\n/);
                    pending = lines.pop() ?? '';
                    for (const line of lines) {
                        emitLine(line);
                    }
                };
                if (config.sendWholeFile === true) {
                    const initial = fs.readFileSync(target, 'utf8');
                    for (const line of initial.split(/\r?\n/)) {
                        emitLine(line);
                    }
                }
                const watcher = fs.watch(target, () => {
                    try {
                        const size = fs.statSync(target).size;
                        if (size < position) {
                            // Truncated or replaced: start reading from the top again.
                            position = 0;
                            pending = '';
                        }
                        if (size === position) {
                            return;
                        }
                        const fd = fs.openSync(target, 'r');
                        const length = size - position;
                        const buffer = Buffer.alloc(length);
                        fs.readSync(fd, buffer, 0, length, position);
                        fs.closeSync(fd);
                        position = size;
                        emitChunk(buffer.toString('utf8'));
                    } catch (error) {
                        options.onError?.(error as Error);
                    }
                });
                watcher.on('error', error => {
                    options.onError?.(error as Error);
                });
                listeners.push({
                    port: 0,
                    close: async () => {
                        watcher.close();
                    }
                });
            } else if (node.type === 'websocket-in') {
                let settings;
                try {
                    settings = await resolveWebSocketListenerConfig(config, {
                        configNodes,
                        resolveCredential: options.credentialResolver
                    } as any);
                } catch (error) {
                    await this.stopListeners(listeners, sockets);
                    throw error;
                }
                if (options.host) {
                    settings = { ...settings, host: String(options.host) };
                }
                try {
                    const handle = await webSocketRegistry.listen(settings, message => {
                        void dispatch(
                            node.id,
                            'websocket',
                            message.data,
                            message.remote,
                            shouldReply ? message.reply : undefined
                        );
                    });
                    ports.push(handle.port);
                    listeners.push({ port: handle.port, close: () => handle.close() });
                } catch (error) {
                    await this.stopListeners(listeners, sockets);
                    throw error;
                }
            } else {
                const socket = dgram.createSocket('udp4');
                socket.on('error', error => options.onError?.(error));
                socket.on('message', (message, remote) => {
                    void dispatch(
                        node.id,
                        'udp',
                        message.toString('utf8'),
                        { address: remote.address, port: remote.port },
                        shouldReply ? payload => {
                            try {
                                socket.send(payload, remote.port, remote.address);
                            } catch (error) {
                                options.onError?.(error as Error);
                            }
                        } : undefined
                    );
                });
                try {
                    const bound = await new Promise<number>((resolve, reject) => {
                        const onError = (error: Error) => reject(error);
                        socket.once('error', onError);
                        socket.bind(port, host, () => {
                            socket.off('error', onError);
                            const address = socket.address();
                            resolve(typeof address === 'object' && address ? address.port : port);
                        });
                    });
                    ports.push(bound);
                    listeners.push({
                        port: bound,
                        close: () => new Promise(resolve => socket.close(() => resolve()))
                    });
                } catch (error) {
                    try {
                        socket.close();
                    } catch {
                        // already closed
                    }
                    await this.stopListeners(listeners, sockets);
                    throw error;
                }
            }
        }

        // `websocket-out` nodes that broadcast through a shared listener keep
        // that server alive for the lifetime of this run/deployment.
        for (const node of definition.nodes || []) {
            if (node.type !== 'websocket-out' || !String(node.config?.websocket || '').trim()) {
                continue;
            }
            let settings;
            try {
                settings = await resolveWebSocketListenerConfig(node.config || {}, {
                    configNodes,
                    resolveCredential: options.credentialResolver
                } as any);
            } catch (error) {
                await this.stopListeners(listeners, sockets);
                throw error;
            }
            if (options.host) {
                settings = { ...settings, host: String(options.host) };
            }
            try {
                const handle = await webSocketRegistry.listen(settings);
                ports.push(handle.port);
                listeners.push({ port: handle.port, close: () => handle.close() });
            } catch (error) {
                await this.stopListeners(listeners, sockets);
                throw error;
            }
        }

        return {
            get running(): boolean {
                return running;
            },
            get ports(): number[] {
                return [...ports];
            },
            stop: async () => {
                if (!running) {
                    return;
                }
                running = false;
                await this.stopListeners(listeners, sockets);
            }
        };
    }

    private async stopListeners(listeners: Listener[], sockets: Set<net.Socket>): Promise<void> {
        sockets.forEach(socket => socket.destroy());
        sockets.clear();
        await Promise.all(listeners.map(listener => listener.close().catch(() => undefined)));
    }
}
