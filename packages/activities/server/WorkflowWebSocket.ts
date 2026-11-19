import * as http from 'node:http';
import * as https from 'node:https';
import { Injectable, OnDestroy } from '@tsdi/ioc';
import type { WorkflowTlsOptions, WorkflowWebSocketBroadcastRequest } from '../src/visual/VisualWorkflowService';

/** Settings shared by `websocket-in` and `websocket-out` through a config node. */
export interface WorkflowWebSocketListenerOptions {
    host: string;
    port: number;
    path?: string;
    tls?: WorkflowTlsOptions;
}

export interface WorkflowWebSocketInboundMessage {
    data: string;
    remote?: { address?: string; port?: number };
    /** Send a reply back over the same connection (used by `reply` nodes). */
    reply?: (payload: string) => void;
}

export type WorkflowWebSocketHandler = (message: WorkflowWebSocketInboundMessage) => void;

export interface WorkflowWebSocketListenHandle {
    /** Bound port (a configured `0` is resolved to the real port). */
    readonly port: number;
    close(): Promise<void>;
}

interface SharedListener {
    key: string;
    options: WorkflowWebSocketListenerOptions;
    webSocketServer: any;
    httpServer: http.Server | https.Server;
    port: number;
    clients: Set<any>;
    handlers: Set<WorkflowWebSocketHandler>;
    refs: number;
}

function normalizeListener(options: WorkflowWebSocketListenerOptions): WorkflowWebSocketListenerOptions {
    const path = String(options?.path || '').trim();
    return {
        host: String(options?.host || '').trim() || '0.0.0.0',
        port: Math.max(0, Math.min(65535, Number(options?.port) || 0)),
        path: path || undefined,
        tls: options?.tls && Object.keys(options.tls).length ? options.tls : undefined
    };
}

/** Stable key: one server per host/port/path/certificate tuple. */
export function webSocketListenerKey(options: WorkflowWebSocketListenerOptions): string {
    const normalized = normalizeListener(options);
    return [
        normalized.host,
        normalized.port,
        normalized.path || '',
        normalized.tls ? JSON.stringify(normalized.tls) : ''
    ].join('|');
}

async function loadWebSocketServer(): Promise<any> {
    let WebSocketServer: any;
    try {
        const module: any = await import('ws');
        WebSocketServer = module.WebSocketServer || module.default?.WebSocketServer;
    } catch {
        WebSocketServer = undefined;
    }
    if (!WebSocketServer) {
        throw new Error('WebSocket listeners require the optional "ws" package.');
    }
    return WebSocketServer;
}

function createHttpServer(tls?: WorkflowTlsOptions): http.Server | https.Server {
    if (tls && (tls.cert || tls.key)) {
        return https.createServer({
            ca: tls.ca,
            cert: tls.cert,
            key: tls.key
        });
    }
    return http.createServer();
}

/**
 * One HTTP(S)/WebSocket server per listener configuration.
 *
 * `websocket-in` nodes subscribe handlers; `websocket-out` nodes broadcast to
 * every connected client. Nodes sharing a config node therefore share a single
 * port instead of racing to bind the same address, mirroring Node-RED's
 * websocket-listener.
 */
export class WorkflowWebSocketRegistry {
    private readonly listeners = new Map<string, SharedListener>();

    get listenerCount(): number {
        return new Set(this.listeners.values()).size;
    }

    async listen(
        options: WorkflowWebSocketListenerOptions,
        handler?: WorkflowWebSocketHandler
    ): Promise<WorkflowWebSocketListenHandle> {
        const normalized = normalizeListener(options);
        const key = webSocketListenerKey(normalized);
        let shared = this.listeners.get(key);
        if (!shared) {
            shared = await this.create(key, normalized);
            this.listeners.set(key, shared);
            // `port: 0` binds an ephemeral port; expose the resolved port for
            // broadcasts and for callers that learned it from the handle.
            const boundKey = webSocketListenerKey({ ...normalized, port: shared.port });
            if (boundKey !== key) {
                this.listeners.set(boundKey, shared);
            }
        }
        shared.refs += 1;
        if (handler) {
            shared.handlers.add(handler);
        }
        return {
            port: shared.port,
            close: () => this.release(key, shared!, handler)
        };
    }

    /** Send to every client of the running listener; returns the client count. */
    async broadcast(options: WorkflowWebSocketListenerOptions, payload: string): Promise<number> {
        const key = webSocketListenerKey(options);
        const shared = this.listeners.get(key);
        if (!shared) {
            const normalized = normalizeListener(options);
            throw new Error(
                `WebSocket listener is not running for ${normalized.host}:${normalized.port}${normalized.path || ''}. `
                + 'Start the workflow that owns the listener (a websocket-in or websocket-out reference) first.'
            );
        }
        let sent = 0;
        for (const client of [...shared.clients]) {
            if (client.readyState !== 1) {
                continue;
            }
            try {
                client.send(payload);
                sent += 1;
            } catch {
                shared.clients.delete(client);
            }
        }
        return sent;
    }

    close(): void {
        for (const shared of new Set(this.listeners.values())) {
            this.closeShared(shared);
        }
        this.listeners.clear();
    }

    protected async create(key: string, options: WorkflowWebSocketListenerOptions): Promise<SharedListener> {
        const WebSocketServer = await loadWebSocketServer();
        const httpServer = createHttpServer(options.tls);
        await new Promise<void>((resolve, reject) => {
            const onError = (error: Error) => {
                httpServer.off('listening', onListening);
                reject(error);
            };
            const onListening = () => {
                httpServer.off('error', onError);
                resolve();
            };
            httpServer.once('error', onError);
            httpServer.once('listening', onListening);
            httpServer.listen(options.port, options.host);
        }).catch(error => {
            try {
                httpServer.close();
            } catch {
                // already closed
            }
            throw error;
        });
        const address = httpServer.address();
        const port = typeof address === 'object' && address ? address.port : options.port;
        const webSocketServer = new WebSocketServer({ server: httpServer, path: options.path });
        const shared: SharedListener = {
            key,
            options,
            webSocketServer,
            httpServer,
            port,
            clients: new Set(),
            handlers: new Set(),
            refs: 0
        };
        webSocketServer.on('connection', (socket: any) => {
            shared.clients.add(socket);
            socket.on('close', () => shared.clients.delete(socket));
            socket.on('error', () => shared.clients.delete(socket));
            socket.on('message', (chunk: any) => {
                const data = chunk?.toString ? chunk.toString('utf8') : String(chunk ?? '');
                const remote = typeof socket._socket?.remoteAddress === 'string'
                    ? { address: socket._socket.remoteAddress, port: socket._socket.remotePort }
                    : undefined;
                for (const listener of [...shared.handlers]) {
                    try {
                        listener({
                            data,
                            remote,
                            reply: payload => {
                                try {
                                    socket.send(payload);
                                } catch {
                                    // sending to a closed socket is not fatal
                                }
                            }
                        });
                    } catch {
                        // A throwing node must not break the shared server.
                    }
                }
            });
        });
        webSocketServer.on('error', () => {
            // Listener-level errors are surfaced by individual connections;
            // dropping every handler would hide recoverable client failures.
        });
        return shared;
    }

    protected async release(
        key: string,
        shared: SharedListener,
        handler?: WorkflowWebSocketHandler
    ): Promise<void> {
        if (handler) {
            shared.handlers.delete(handler);
        }
        shared.refs = Math.max(0, shared.refs - 1);
        if (shared.refs > 0) {
            return;
        }
        if (this.listeners.get(key) === shared) {
            this.listeners.delete(key);
        }
        if (shared.refs <= 0) {
            for (const [entryKey, entry] of [...this.listeners]) {
                if (entry === shared) {
                    this.listeners.delete(entryKey);
                }
            }
        }
        await this.closeSharedAsync(shared);
    }

    protected closeShared(shared: SharedListener): void {
        void this.closeSharedAsync(shared);
    }

    protected async closeSharedAsync(shared: SharedListener): Promise<void> {
        for (const client of [...shared.clients]) {
            try {
                client.terminate?.();
            } catch {
                // already closed
            }
        }
        shared.clients.clear();
        shared.handlers.clear();
        try {
            shared.webSocketServer?.close?.();
        } catch {
            // already closed
        }
        await new Promise<void>(resolve => {
            try {
                shared.httpServer.close(() => resolve());
            } catch {
                resolve();
            }
        });
    }
}

/** Process-wide listener registry shared by inbound nodes and outbound broadcasts. */
export const sharedWebSocketRegistry = new WorkflowWebSocketRegistry();

/** Host transport for `websocket-out` broadcasts; closes listeners with the app. */
@Injectable()
export class WorkflowWebSocketTransport implements OnDestroy {
    constructor(private readonly registry: WorkflowWebSocketRegistry = sharedWebSocketRegistry) { }

    async broadcast(message: WorkflowWebSocketBroadcastRequest): Promise<number> {
        return this.registry.broadcast({
            host: message.host,
            port: message.port,
            path: message.path,
            tls: message.tls
        }, message.payload);
    }

    onDestroy(): void {
        this.registry.close();
    }
}
