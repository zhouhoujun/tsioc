import * as dgram from 'node:dgram';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { Injectable, OnDestroy } from '@tsdi/ioc';
import {
    WorkflowTcpSendRequest,
    WorkflowUdpSendRequest,
    WorkflowWebSocketSendRequest
} from '../src/visual/VisualWorkflowService';

interface TlsLike {
    ca?: string;
    cert?: string;
    key?: string;
    servername?: string;
    rejectUnauthorized?: boolean;
}

function timeoutError(label: string, timeoutMs: number): Error {
    return new Error(`${label} timed out after ${timeoutMs}ms`);
}

/**
 * Host transports for `tcp-out` / `udp-out` / `websocket-out`.
 *
 * The workflow runtime stays host-agnostic; browser hosts simply do not install
 * these senders and the nodes report a clear error instead of failing silently.
 */
@Injectable()
export class WorkflowNetTransport implements OnDestroy {
    private readonly sockets = new Set<net.Socket>();

    async sendTcp(message: WorkflowTcpSendRequest): Promise<void> {
        const payload = Buffer.from(String(message.payload ?? ''), 'utf8');
        await new Promise<void>((resolve, reject) => {
            const options = message.tls?.key || message.tls?.cert
                ? {
                    host: message.host,
                    port: message.port,
                    ...this.tlsOptions(message.tls)
                }
                : undefined;
            const socket = options
                ? tls.connect(options)
                : net.connect({ host: message.host, port: message.port });
            this.sockets.add(socket);
            const timeoutMs = Math.max(0, Number(message.timeoutMs) || 0);
            const timer = timeoutMs
                ? setTimeout(() => {
                    socket.destroy();
                    reject(timeoutError('TCP send', timeoutMs));
                }, timeoutMs)
                : undefined;
            const finish = (error?: Error) => {
                if (timer) {
                    clearTimeout(timer);
                }
                this.sockets.delete(socket);
                socket.destroy();
                error ? reject(error) : resolve();
            };
            socket.once(options ? 'secureConnect' : 'connect', () => {
                socket.write(payload, () => socket.end());
            });
            socket.once('error', error => finish(error as Error));
            socket.once('close', () => finish());
        });
    }

    async sendUdp(message: WorkflowUdpSendRequest): Promise<void> {
        const payload = Buffer.from(String(message.payload ?? ''), 'utf8');
        await new Promise<void>((resolve, reject) => {
            const socket = dgram.createSocket('udp4');
            if (message.broadcast === true) {
                socket.setBroadcast(true);
            }
            const timeoutMs = Math.max(0, Number(message.timeoutMs) || 0);
            const timer = timeoutMs
                ? setTimeout(() => {
                    socket.close();
                    reject(timeoutError('UDP send', timeoutMs));
                }, timeoutMs)
                : undefined;
            const finish = (error?: Error) => {
                if (timer) {
                    clearTimeout(timer);
                }
                try {
                    socket.close();
                } catch {
                    // already closed
                }
                error ? reject(error) : resolve();
            };
            socket.once('error', error => finish(error as Error));
            socket.send(payload, message.port, message.host, error => finish(error as Error | undefined));
        });
    }

    async sendWebSocket(message: WorkflowWebSocketSendRequest): Promise<void> {
        let WebSocket: any;
        try {
            const module: any = await import('ws');
            WebSocket = module.WebSocket || module.default?.WebSocket || module.default;
        } catch {
            WebSocket = undefined;
        }
        if (!WebSocket) {
            throw new Error('WebSocket out requires the optional "ws" package.');
        }
        await new Promise<void>((resolve, reject) => {
            const options: Record<string, any> = {};
            if (message.headers && Object.keys(message.headers).length) {
                options.headers = message.headers;
            }
            if (message.tls && Object.keys(message.tls).length) {
                options.tls = message.tls;
            }
            const socket = new WebSocket(
                String(message.url),
                message.subprotocol ? [message.subprotocol] : undefined,
                options
            );
            const timeoutMs = Math.max(0, Number(message.timeoutMs) || 0);
            const timer = timeoutMs
                ? setTimeout(() => {
                    try {
                        socket.terminate?.();
                    } catch {
                        // ignore
                    }
                    reject(timeoutError('WebSocket send', timeoutMs));
                }, timeoutMs)
                : undefined;
            const finish = (error?: Error) => {
                if (timer) {
                    clearTimeout(timer);
                }
                try {
                    socket.close?.();
                } catch {
                    // ignore
                }
                error ? reject(error) : resolve();
            };
            socket.once('open', () => {
                socket.send(String(message.payload ?? ''), (error: Error | undefined) => finish(error));
            });
            socket.once('error', (error: Error) => finish(error));
        });
    }

    onDestroy(): void {
        for (const socket of this.sockets) {
            try {
                socket.destroy();
            } catch {
                // ignore
            }
        }
        this.sockets.clear();
    }

    private tlsOptions(options?: TlsLike): Record<string, any> {
        if (!options) {
            return {};
        }
        return {
            ...(options.ca ? { ca: options.ca } : {}),
            ...(options.cert ? { cert: options.cert } : {}),
            ...(options.key ? { key: options.key } : {}),
            ...(options.servername ? { servername: options.servername } : {}),
            rejectUnauthorized: options.rejectUnauthorized !== false
        };
    }
}
