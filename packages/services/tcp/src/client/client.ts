import { Injectable, isString, promisify, Context, Injector, Provider, Inject, asProvider, ArgumentException, composeInterceptors } from '@tsdi/ioc';
import { Pattern, LOCALHOST, RequestInitOpts, UrlRequestOptions, Transport, createRequestHandler, ResponseEvent, Event, PatternFormatter, writePacket, StreamAdapter, RequestInterceptorFn, TransferSide } from '@tsdi/common';
import { AbstractClient, ClientFeatureKind, makeClientFeature, ClientTransportFeature, getClientHandlerToken, getClientToken, ClientHandler, getClientBackendToken, createClientTransferHandler, getClientTransfersToken } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import { from, fromEvent, Observable } from 'rxjs';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { TCP_CLIENT_OPTIONS, TcpClientConfig } from './options';
import { TcpRequest } from './request';
import { SOCKET } from '@tsdi/common/transport';





/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable()
export class TcpClient extends AbstractClient<TcpRequest<any>, ResponseEvent<any>, UrlRequestOptions> {


    @InjectLog()
    private logger!: Logger;

    private connection!: tls.TLSSocket | net.Socket;
    // private _transport?: ClientTransport<tls.TLSSocket | net.Socket>;

    constructor(
        readonly handler: ClientHandler<TcpRequest<any>, ResponseEvent<any>>,
        @Inject(TCP_CLIENT_OPTIONS, { nullable: true }) private options: TcpClientConfig
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
        return new Observable<tls.TLSSocket | net.Socket>((observer) => {
            const valid = this.connection && this.isValid(this.connection as (tls.TLSSocket | net.Socket) & { destroyed: boolean, closed: boolean });
            if (!valid) {
                if (this.connection) this.connection.removeAllListeners();
                this.connection = this.createConnection(this.options);
            }
            let cleaned = false;
            const conn = this.connection;
            const onError = (err: any) => {
                this.logger?.error(err);
                observer.error(err);
            }
            const onConnect = () => {
                observer.next(conn);
                this.context.setValue(SOCKET, conn);
                // if (!this.init) {
                //     this.init = true;
                //     this.handler.append({
                //         backend: createClientTransferHandler(
                //             this.context,
                //             (req, context) => {
                //                 this.connection.on()
                //             },
                //             this.options)
                //     })
                // }
                observer.complete();
            }
            const onClose = () => {
                conn.end();
                observer.complete();
            }
            conn.on(Event.ERROR, onError)
                .on(Event.DISCONNECT, onError)
                .on(Event.END, onClose)
                .on(Event.CLOSE, onClose)
            // .on(Event.MESSAGE,);




            if (valid) {
                onConnect()
            } else {
                conn.on(Event.CONNECT, onConnect)
            }

            return () => {
                if (cleaned) return;
                cleaned = true;
                conn.off(Event.CONNECT, onConnect)
                    .off(Event.ERROR, onError)
                    .off(Event.DISCONNECT, onError)
                    .off(Event.END, onClose)
                    .off(Event.CLOSE, onClose);
            }
        });
    }

    protected override initContext(context: Context): void {
        context.set(TcpClient, this);
        // context.set(ClientTransport, this._transport);
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
        // await this._transport?.destroy();
        await promisify(this.connection.destroy, this.connection)(null!)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
    }

    protected isValid(connection: (tls.TLSSocket | net.Socket) & { destroyed: boolean, closed: boolean }): boolean {
        return !connection.destroyed && connection.closed !== true
    }

    protected createConnection(opts: TcpClientConfig): tls.TLSSocket | net.Socket {
        const socket = (opts.connectOpts as tls.ConnectionOptions).cert ? tls.connect(opts.connectOpts as tls.ConnectionOptions) : net.connect(opts.connectOpts as net.NetConnectOpts);
        if (opts.keepalive) {
            socket.setKeepAlive(true, opts.keepalive);
        }
        return socket
    }

}


export function withTcpClientTransport(...options: Partial<TcpClientConfig>[]): ClientTransportFeature[] {
    return options.map(option => {
        option.transport = Transport.TCP;
        option.side = TransferSide.client;
        const config = option as TcpClientConfig;
        const clientToken = getClientToken(config);
        const hanlderToken = getClientHandlerToken(config);
        const backendToken = getClientBackendToken(config);
        // const transersToken = getClientTransfersToken(config);

        const providers: Provider[] = [
            asProvider({
                provide: backendToken,
                useFactory: () => {
                    let socket: tls.TLSSocket | net.Socket;
                    let source$: Observable<any>;
                    // let chain: RequestInterceptorFn;
                    return (data: any, context) => {

                        const currSocket = context.get(SOCKET) as tls.TLSSocket | net.Socket;
                        if (!currSocket) throw new ArgumentException('no socket in context');
                        // if (!chain) {
                        //     chain = composeInterceptors(context.getInjector().get(transersToken));
                        // }

                        if (socket !== currSocket) {
                            if (socket) {
                                socket.removeAllListeners();
                            }
                            socket = currSocket;
                            source$ = fromEvent(socket, Event.MESSAGE);
                        }

                        const emit$ = writePacket(socket, data, context.get(StreamAdapter));

                        if (context.get(TcpRequest)?.observe === 'emit') {
                            return from(emit$);
                        }

                        return source$

                        // context.set(TcpRequest, req);
                        // return chain(req, (data, context) => {
                        //     const emit$ = writePacket(socket, data, context.get(StreamAdapter));

                        //     if (req.observe === 'emit') {
                        //         return from(emit$);
                        //     }

                        //     return source$
                        // }, context)
                    }
                },
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

        if (options.length == 1 || option.asDefault) {
            providers.push({
                provide: TcpClient,
                useExisting: clientToken
            })
        }

        return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
    });
}