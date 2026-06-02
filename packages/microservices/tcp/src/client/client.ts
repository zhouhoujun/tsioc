import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, LOCALHOST, RequestInitOpts, UrlRequestOptions, ResponseEvent, Events, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { SOCKET } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable, switchMap } from 'rxjs';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { TCP_CLIENT_OPTIONS, TcpClientOptions } from './options';
import { TcpRequest } from './request';

/**
 * TcpClient for microservices.
 * 微服务 TCP 客户端
 */
@Injectable()
export class TcpClient extends AbstractClient<TcpRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

    @InjectLog()
    private logger!: Logger;

    private connection!: tls.TLSSocket | net.Socket;
    private shutdownTimer: NodeJS.Timeout | null = null;

    constructor(
        readonly handler: ClientHandler<TcpRequest<any>, ResponseEvent<any>>,
        @Inject(TCP_CLIENT_OPTIONS, { nullable: true }) private options: TcpClientOptions
    ) {
        super();
        if (!options.connectOpts) {
            options.connectOpts = {
                port: 3000,
                host: LOCALHOST
            };
        }
    }

    protected connect(): Observable<tls.TLSSocket | net.Socket> {
        return defer(async () => {
            const valid = this.connection && this.isValid(this.connection as (tls.TLSSocket | net.Socket) & { destroyed: boolean, closed: boolean });
            if (valid) return this.connection;

            if (this.connection) {
                this.clearShutdownTimer();
                this.connection.removeAllListeners();
                this.connection.destroy();
            }

            return await new Promise<tls.TLSSocket | net.Socket>((resolve, reject) => {
                const conn = this.createConnection(this.options);

                const cleanup = () => {
                    conn.off(Events.CONNECT, onConnect)
                        .off(Events.ERROR, onError)
                        .off(Events.END, onEnd)
                        .off(Events.CLOSE, onClose);
                };

                const onError = (err: any) => {
                    cleanup();
                    this.logger?.error('Connection error:', err);
                    reject(err);
                };

                const onConnect = () => {
                    cleanup();
                    this.connection = conn;
                    resolve(conn);
                };

                const onEnd = () => {
                    cleanup();
                    conn.end();
                };

                const onClose = () => {
                    cleanup();
                    if (!this.connection) {
                        reject(new Error('Connection closed before connect'));
                    }
                };

                conn.on(Events.ERROR, onError)
                    .on(Events.CONNECT, onConnect)
                    .once(Events.END, onEnd)
                    .once(Events.CLOSE, onClose);
            });

        });
    }

    protected initContext(context: Context, req: TcpRequest<any>): void {
        context.set(TcpClient, this);
        context.set(TcpRequest, req);
        context.set(SOCKET, this.connection);
    }

    protected buildRequest(first: TcpRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): TcpRequest<any> {
        if (first instanceof TcpRequest) {
            return first;
        }
        options.withCredentials = this.connection instanceof tls.TLSSocket;
        const defaultMethod = this.options.microservice ? undefined : 'GET';
        if (isString(first)) {
            return new TcpRequest(first, null, options, defaultMethod);
        } else {
            return new TcpRequest(this.handler.injector.get(PatternFormatter).format(first), first, options, defaultMethod);
        }
    }

    protected override request(first: Pattern | TcpRequest<any>, options: UrlRequestOptions = {} as any): Observable<any> {
        return this.connect().pipe(
            switchMap(() => super.request(first, options))
        );
    }

    protected async onShutdown(): Promise<void> {
        if (!this.connection || this.connection.destroyed) return;

        return new Promise<void>((resolve) => {
            const connection = this.connection;
            let cleaned = false;
            const cleanup = () => {
                if (cleaned) {
                    return;
                }
                cleaned = true;
                this.clearShutdownTimer();
                connection.removeAllListeners();
                if (this.connection === connection) {
                    this.connection = null!;
                }
                resolve();
            };

            connection.once(Events.CLOSE, cleanup);

            this.shutdownTimer = setTimeout(() => {
                if (connection && !connection.destroyed) {
                    this.logger?.warn('TCP client connection shutdown timeout, forcing destroy');
                    connection.destroy();
                }
            }, 5000);

            connection.end();
        }).catch(err => {
            this.logger?.error('TCP client shutdown error:', err);
            this.clearShutdownTimer();
            if (this.connection) {
                this.connection.removeAllListeners();
                this.connection.destroy();
                this.connection = null!;
            }
        });
    }

    protected isValid(connection: (tls.TLSSocket | net.Socket) & { destroyed: boolean, closed: boolean }): boolean {
        return !connection.destroyed && connection.closed !== true;
    }

    protected createConnection(opts: TcpClientOptions): tls.TLSSocket | net.Socket {
        const socket = (opts.connectOpts as tls.ConnectionOptions).cert ? tls.connect(opts.connectOpts as tls.ConnectionOptions) : net.connect(opts.connectOpts as net.NetConnectOpts);
        if (opts.keepalive) {
            socket.setKeepAlive(true, opts.keepalive);
        }
        return socket;
    }

    private clearShutdownTimer() {
        if (this.shutdownTimer) {
            clearTimeout(this.shutdownTimer);
            this.shutdownTimer = null;
        }
    }
}
