import * as dgram from 'node:dgram';
import * as net from 'node:net';
import { ActivityContext, ActivityResult } from '../src/activities/Activity';
import { VisualWorkflowDefinition, WorkflowExecutionOptions } from '../src/visual/types';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowMqttClient } from './WorkflowMqtt';

/** Message delivered to a `tcp-in` / `udp-in` node through `context.inbound`. */
export interface WorkflowInboundMessage {
    nodeId: string;
    transport: 'tcp' | 'udp' | 'websocket' | 'mqtt';
    data: string;
    /** MQTT topic the message arrived on. */
    topic?: string;
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
            transport: 'tcp' | 'udp' | 'websocket' | 'mqtt',
            data: string,
            remote: WorkflowInboundMessage['remote'],
            reply: ((payload: string) => void) | undefined,
            topic?: string
        ): Promise<void> => {
            if (!running) {
                return;
            }
            const message: WorkflowInboundMessage = { nodeId, transport, data, remote, ...(topic ? { topic } : {}) };
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

        const mqttClients: WorkflowMqttClient[] = [];
        const inboundNodes = (definition.nodes || []).filter(node =>
            node.type === 'tcp-in' || node.type === 'udp-in'
            || node.type === 'websocket-in' || node.type === 'mqtt-in'
        );

        for (const node of inboundNodes) {
            const config = node.config || {};
            const host = String(options.host || config.host || '0.0.0.0');
            const port = Math.max(0, Math.min(65535, Number(config.port) || 0));
            const shouldReply = config.reply === true;

            if (node.type === 'tcp-in') {
                const server = net.createServer(socket => {
                    sockets.add(socket);
                    socket.on('close', () => sockets.delete(socket));
                    socket.on('error', () => sockets.delete(socket));
                    socket.on('data', chunk => {
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
                });
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
                const url = String(config.url || '').trim();
                const topic = String(config.topic || '').trim();
                if (!url || !topic) {
                    await this.stopListeners(listeners, sockets);
                    mqttClients.forEach(client => client.close());
                    throw new Error('MQTT in needs a broker URL and a topic.');
                }
                const client = new WorkflowMqttClient({
                    url,
                    clientId: config.clientId ? String(config.clientId) : undefined,
                    username: config.username ? String(config.username) : undefined,
                    password: config.password ? String(config.password) : undefined
                });
                try {
                    // `subscribe` connects and waits for SUBACK so `start()`
                    // only resolves once the listener is really active.
                    await client.subscribe(topic, Number(config.qos) === 1 ? 1 : 0, message => {
                        void dispatch(
                            node.id,
                            'mqtt',
                            message.payload,
                            undefined,
                            undefined,
                            message.topic
                        );
                    });
                } catch (error) {
                    client.close();
                    await this.stopListeners(listeners, sockets);
                    mqttClients.forEach(entry => entry.close());
                    throw error;
                }
                mqttClients.push(client);
                listeners.push({
                    port: 0,
                    close: async () => client.close()
                });
            } else if (node.type === 'websocket-in') {
                let WebSocketServer: any;
                try {
                    const module: any = await import('ws');
                    WebSocketServer = module.WebSocketServer || module.default?.WebSocketServer;
                } catch {
                    WebSocketServer = undefined;
                }
                if (!WebSocketServer) {
                    await this.stopListeners(listeners, sockets);
                    throw new Error('WebSocket inbound requires the optional "ws" package.');
                }
                const path = String(config.path || '');
                const server = new WebSocketServer({ host, port, path: path || undefined });
                const clients = new Set<any>();
                server.on('connection', (socket: any) => {
                    clients.add(socket);
                    socket.on('close', () => clients.delete(socket));
                    socket.on('error', () => clients.delete(socket));
                    socket.on('message', (chunk: any) => {
                        const remote = typeof socket._socket?.remoteAddress === 'string'
                            ? { address: socket._socket.remoteAddress, port: socket._socket.remotePort }
                            : undefined;
                        void dispatch(
                            node.id,
                            'websocket',
                            chunk?.toString ? chunk.toString('utf8') : String(chunk ?? ''),
                            remote,
                            shouldReply ? payload => {
                                try {
                                    socket.send(payload);
                                } catch (error) {
                                    options.onError?.(error as Error);
                                }
                            } : undefined
                        );
                    });
                });
                try {
                    const bound = await new Promise<number>((resolve, reject) => {
                        const onError = (error: Error) => reject(error);
                        server.once('error', onError);
                        server.once('listening', () => {
                            server.off('error', onError);
                            const address = server.address();
                            resolve(typeof address === 'object' && address ? address.port : port);
                        });
                    });
                    ports.push(bound);
                    listeners.push({
                        port: bound,
                        close: () => new Promise(resolve => {
                            clients.forEach(client => {
                                try {
                                    client.terminate?.();
                                } catch {
                                    // already closed
                                }
                            });
                            clients.clear();
                            server.close(() => resolve());
                        })
                    });
                } catch (error) {
                    clients.forEach(client => {
                        try {
                            client.terminate?.();
                        } catch {
                            // already closed
                        }
                    });
                    try {
                        server.close();
                    } catch {
                        // already closed
                    }
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
