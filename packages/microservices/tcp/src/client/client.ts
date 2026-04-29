import { Injectable, isString, Context, Injector, Provider, Inject, asProvider } from '@tsdi/ioc';
import { Pattern, LOCALHOST, RequestInitOpts, UrlRequestOptions, Transport, createRequestHandler, ResponseEvent, Events, PatternFormatter, TransferSide } from '@tsdi/common';
import { AbstractClient, ClientFeatureKind, makeClientFeature, ClientTransportFeature, getClientHandlerToken, getClientToken, ClientHandler, getClientBackendToken, CLIENT_CONFIGS } from '@tsdi/client';
import { SOCKET, createSendMessageBackend } from '@tsdi/common/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable } from 'rxjs';
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

    protected override initContext(context: Context, req: TcpRequest<any>): void {
        context.set(TcpClient, this);
        context.set(TcpRequest, req);
        context.set(SOCKET, this.connection);
    }

    protected override createRequest(pattern: Pattern, options: RequestInitOpts<any, UrlRequestOptions>): TcpRequest<any> {
        options.withCredentials = this.connection instanceof tls.TLSSocket;
        const defaultMethod = this.options.microservice ? undefined : 'GET';
        if (isString(pattern)) {
            return new TcpRequest(pattern, null, options, defaultMethod);
        } else {
            return new TcpRequest(this.injector.get(PatternFormatter).format(pattern), pattern, options, defaultMethod);
        }
    }

    protected override async onShutdown(): Promise<void> {
        if (!this.connection || this.connection.destroyed) return;

        return new Promise<void>((resolve) => {
            const cleanup = () => {
                this.connection.removeAllListeners();
                this.connection = null!;
                resolve();
            };

            this.connection.once(Events.CLOSE, cleanup);

            // Use end() for graceful shutdown, which will trigger 'close' event
            this.connection.end();

            // Set a timeout to force destroy if graceful shutdown takes too long
            const timeout = setTimeout(() => {
                if (this.connection && !this.connection.destroyed) {
                    this.logger?.warn('TCP client connection shutdown timeout, forcing destroy');
                    this.connection.destroy();
                }
            }, 5000);

            // Clear timeout when cleanup runs
            this.connection.once(Events.CLOSE, () => {
                clearTimeout(timeout);
            });
        }).catch(err => {
            this.logger?.error('TCP client shutdown error:', err);
            // Ensure cleanup even on error
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
}

/**
 * Create TCP client transport feature for microservices.
 * 创建微服务 TCP 客户端传输特性
 */
export function tcpClientTransportFactory(option: Partial<TcpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        ...option,
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
        // Preserve token references set by feature functions
        transfersToken: option.transfersToken,
        interceptorsToken: option.interceptorsToken,
        guardsToken: option.guardsToken,
        filtersToken: option.filtersToken,
        backendToken: option.backendToken
    } as TcpClientOptions;
    config.transport = Transport.TCP;
    config.side = TransferSide.client;
    const clientToken = getClientToken(config);
    const handlerToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({
            provide: backendToken,
            useFactory: createSendMessageBackend,
            multi: true
        }),
        {
            provide: handlerToken,
            useFactory: (injector: Injector) => {
                return createRequestHandler(injector, config);
            },
            deps: [
                Injector
            ]
        },
        {
            provide: clientToken,
            useFactory: (handler: ClientHandler<TcpRequest<any>, ResponseEvent<any>>) => {
                return new TcpClient(handler, config);
            },
            deps: [
                handlerToken
            ]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: TcpClient,
            useExisting: clientToken
        });
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

/**
 * Helper to create multiple TCP client transports.
 * 创建多个 TCP 客户端传输
 */
export function withTcpClientTransport(...options: Partial<TcpClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        // First option is default unless explicitly specified
        const asDefault = option.asDefault ?? (idx === 0);
        return tcpClientTransportFactory(option, asDefault);
    });
}
