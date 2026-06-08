import { Injectable, isString, Context, Inject, promisify } from '@tsdi/ioc';
import { Pattern, LOCALHOST, RequestInitOpts, UrlRequestOptions, ResponseEvent, Events, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { SOCKET } from '../context';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable, switchMap } from 'rxjs';
import * as WebSocket from 'ws';
import { WS_CLIENT_OPTIONS, WsClientOptions } from './options';
import { WsRequest } from './request';

/**
 * WebSocket client for microservices.
 * 微服务 WebSocket 客户端
 */
@Injectable()
export class WsClient extends AbstractClient<WsRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

    @InjectLog()
    private logger!: Logger;

    private connection!: WebSocket;
    private reconnectAttempts = 0;

    constructor(
        readonly handler: ClientHandler<WsRequest<any>, ResponseEvent<any>>,
        @Inject(WS_CLIENT_OPTIONS, { nullable: true }) private options: WsClientOptions
    ) {
        super();
        if (!options.url && !options.connectOpts) {
            options.url = `ws://${LOCALHOST}:3000`;
        }
    }

    protected connect(): Observable<WebSocket> {
        return defer(async () => {
            const valid = this.connection && this.isValid(this.connection);
            if (valid) return this.connection;

            if (this.connection) {
                this.connection.removeAllListeners();
                this.connection.close();
            }

            return await new Promise<WebSocket>((resolve, reject) => {
                const ws = this.createConnection(this.options);

                const cleanup = () => {
                    ws.off(Events.OPEN, onOpen)
                        .off(Events.ERROR, onError)
                        .off(Events.CLOSE, onClose);
                };

                const onError = (err: any) => {
                    cleanup();
                    this.logger?.error('WebSocket connection error:', err);
                    if (this.options.reconnect && this.reconnectAttempts < (this.options.maxReconnectAttempts ?? 5)) {
                        this.reconnectAttempts++;
                        this.logger?.info(`Reconnecting attempt ${this.reconnectAttempts}...`);
                    } else {
                        reject(err);
                    }
                };

                const onOpen = () => {
                    cleanup();
                    this.connection = ws;
                    this.reconnectAttempts = 0;
                    resolve(ws);
                };

                const onClose = () => {
                    cleanup();
                    if (!this.connection) {
                        reject(new Error('Connection closed before connect'));
                    }
                };

                ws.on(Events.ERROR, onError)
                    .on(Events.OPEN, onOpen)
                    .once(Events.CLOSE, onClose);
            });
        });
    }

    protected initContext(context: Context, req: WsRequest<any>): void {
        context.set(WsClient, this);
        context.set(WsRequest, req);
        context.set(SOCKET, this.connection as any);
    }

    protected buildRequest(first: WsRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): WsRequest<any> {
        if (first instanceof WsRequest) {
            return first;
        }
        const defaultMethod = this.options.microservice ? undefined : 'GET';
        if (isString(first)) {
            return new WsRequest(first, null, options, defaultMethod);
        } else {
            return new WsRequest(this.handler.injector.get(PatternFormatter).format(first), first, options, defaultMethod);
        }
    }

    protected override request(first: Pattern | WsRequest<any>, options: UrlRequestOptions = {} as any): Observable<any> {
        return this.connect().pipe(
            switchMap(() => super.request(first, options))
        );
    }

    protected async onShutdown(): Promise<void> {
        if (!this.connection || this.connection.readyState === WebSocket.CLOSED) return;

        this.connection.close(1001, 'Client shutdown');
        this.connection.terminate();
        this.connection.removeAllListeners();
        this.connection = null!;
    }

    protected isValid(connection: WebSocket): boolean {
        return connection.readyState === WebSocket.OPEN;
    }

    protected createConnection(opts: WsClientOptions): WebSocket {
        const url = opts.url || `ws://${LOCALHOST}:3000`;
        const ws = new WebSocket(url, opts.connectOpts);
        return ws;
    }

    /**
     * Send a message through WebSocket connection.
     * 通过 WebSocket 连接发送消息
     */
    sendMessage(data: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket is not connected'));
                return;
            }

            const message = typeof data === 'string' ? data : JSON.stringify(data);
            this.connection.send(message, (err?: Error) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Wait for next message from WebSocket connection.
     * 等待 WebSocket 连接的下一条消息
     */
    receive(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket is not connected'));
                return;
            }

            const onMessage = (data: WebSocket.RawData) => {
                this.connection.off(Events.ERROR, onError);
                try {
                    const message = data.toString();
                    try {
                        resolve(JSON.parse(message));
                    } catch {
                        resolve(message);
                    }
                } catch (err) {
                    reject(err);
                }
            };

            const onError = (err: Error) => {
                this.connection.off(Events.MESSAGE, onMessage);
                reject(err);
            };

            this.connection.once(Events.MESSAGE, onMessage);
            this.connection.once(Events.ERROR, onError);

            // Timeout
            setTimeout(() => {
                this.connection.off(Events.MESSAGE, onMessage);
                this.connection.off(Events.ERROR, onError);
                reject(new Error('Receive timeout'));
            }, 30000);
        });
    }

}
