import { Injectable, isString, promisify, Context, Injector, Provider, Inject, asProvider } from '@tsdi/ioc';
import { Pattern, LOCALHOST, RequestInitOpts, UrlRequestOptions, Transport, createRequestHandler, ResponseEvent, Events, PatternFormatter, writePacket, StreamAdapter, TransferSide, ResponseFactory, DefaultResponseFactory } from '@tsdi/common';
import { AbstractClient, ClientFeatureKind, makeClientFeature, ClientTransportFeature, getClientHandlerToken, getClientToken, ClientHandler, getClientBackendToken, CLIENT_CONFIGS } from '@tsdi/common/client';
import { SOCKET } from '@tsdi/common/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable } from 'rxjs';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { TCP_CLIENT_OPTIONS, TcpClientOptions } from './options';
import { TcpRequest } from './request';
import { createSendMessageBackend } from '@tsdi/common/transport/src/interceptors';





/**
 * TcpClient. client of  `tcp` or `ipc`. 
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
            }
        }
    }

    protected connect(): Observable<tls.TLSSocket | net.Socket> {
        return defer(async () => {
            const valid = this.connection && this.isValid(this.connection as (tls.TLSSocket | net.Socket) & { destroyed: boolean, closed: boolean });
            if (valid) return this.connection;


            if (this.connection) this.connection.removeAllListeners();

            return await new Promise<tls.TLSSocket | net.Socket>((r, j) => {
                const conn = this.createConnection(this.options);

                const onError = (err: any) => {
                    this.logger?.error(err);
                    j(err);
                }

                const onConnect = () => {
                    this.connection = conn;
                    r(conn);
                }
                const onClose = () => {
                    conn.off(Events.CONNECT, onConnect)
                        .off(Events.ERROR, onError)
                        .off(Events.DISCONNECT, onError)
                        .off(Events.END, onClose)
                        .off(Events.CLOSE, onClose);
                    conn.end();
                }
                conn.on(Events.ERROR, onError)
                    .on(Events.DISCONNECT, onError)
                    .on(Events.END, onClose)
                    .on(Events.CLOSE, onClose)
                    .on(Events.CONNECT, onConnect)
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
            return new TcpRequest(this.context.get(PatternFormatter).format(pattern), pattern, options, defaultMethod);
        }
    }

    protected override async onShutdown(): Promise<void> {
        if (!this.connection || this.connection.destroyed) return;
        await promisify(this.connection.destroy, this.connection)(null!)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
    }

    protected isValid(connection: (tls.TLSSocket | net.Socket) & { destroyed: boolean, closed: boolean }): boolean {
        return !connection.destroyed && connection.closed !== true
    }

    protected createConnection(opts: TcpClientOptions): tls.TLSSocket | net.Socket {
        const socket = (opts.connectOpts as tls.ConnectionOptions).cert ? tls.connect(opts.connectOpts as tls.ConnectionOptions) : net.connect(opts.connectOpts as net.NetConnectOpts);
        if (opts.keepalive) {
            socket.setKeepAlive(true, opts.keepalive);
        }
        return socket
    }

}

export function tcpClientTransportFacotry(option: Partial<TcpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    option.transport = Transport.TCP;
    option.side = TransferSide.client;
    const config = option as TcpClientOptions;
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    config.responseFactory ??= DefaultResponseFactory;

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({
            provide: backendToken,
            useFactory: createSendMessageBackend,
            multi: true
        }),
        {
            provide: hanlderToken,
            useFactory: (injector: Injector) => {
                return createRequestHandler(injector, option)
            },
            deps: [
                Injector
            ]
        },
        {
            provide: clientToken,
            useClass: TcpClient,
            deps: [
                hanlderToken,
                { value: option }
            ]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: TcpClient,
            useExisting: clientToken
        })
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;

}

export function withTcpClientTransport(...options: Partial<TcpClientOptions>[]): ClientTransportFeature[] {
    return options.map(option => tcpClientTransportFacotry(option, options.length == 1 || option.asDefault));
}

