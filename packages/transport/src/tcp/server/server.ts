import {
    CustomEndpoint, Deserializer, EndpointBackend, ExecptionFilter, Interceptor, InterceptorLike,
    MiddlewareLike, Packet, ServerOptions, TransportError, TransportServer
} from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, isString, lang, Nullable, Token, tokenId } from '@tsdi/ioc';
import { Server, ListenOptions, Socket } from 'net';
import { mergeMap, Observable, Observer, of, Subscription } from 'rxjs';
import { ev } from '../../consts';
import { CatchInterceptor, LogInterceptor, DecodeInterceptor, EncodeInterceptor } from '../../interceptors';
import { TcpContext, TCP_EXECPTION_FILTERS, TCP_MIDDLEWARES } from './context';
import { TcpServRequest } from './request';
import { TcpServResponse } from './response';



/**
 * TCP server options.
 */
export interface TcpServerOpts {
    /**
     * Indicates whether half-opened TCP connections are allowed.
     * @default false
     */
    allowHalfOpen?: boolean | undefined;
    /**
     * Indicates whether the socket should be paused on incoming connections.
     * @default false
     */
    pauseOnConnect?: boolean | undefined;
}

/**
 * TCP server options.
 */
@Abstract()
export abstract class TcpServerOptions extends ServerOptions<TcpServRequest, TcpServResponse> {
    /**
     * header split code.
     */
    abstract headerSplit?: string;
    /**
     * socket timeout.
     */
    abstract timeout?: number;
    abstract encoding?: BufferEncoding;
    abstract serverOpts?: TcpServerOpts | undefined;
    abstract listenOptions: ListenOptions;
}

/**
 * Tcp server interceptors.
 */
export const TCP_SERV_INTERCEPTORS = tokenId<Interceptor<TcpServRequest, TcpServResponse>[]>('TCP_SERV_INTERCEPTORS');

const defOpts = {
    encoding: 'utf8',
    headerSplit: '#',
    interceptorsToken: TCP_SERV_INTERCEPTORS,
    execptionsToken: TCP_EXECPTION_FILTERS,
    middlewaresToken: TCP_MIDDLEWARES,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        DecodeInterceptor,
        EncodeInterceptor
    ],
    listenOptions: {
        port: 3000,
        host: 'localhost'
    }
} as TcpServerOptions;


/**
 * TCP server.
 */
@Injectable()
export class TcpServer extends TransportServer<TcpServRequest, TcpServResponse, TcpContext> {

    private server?: Server;
    private options!: TcpServerOptions;
    constructor(
        @Inject() readonly context: InvocationContext,
        @Nullable() options: TcpServerOptions) {
        super(context, options)
        this.initialize(this.options);

    }

    protected override initOption(options: TcpServerOptions): TcpServerOptions {
        this.options = { ...defOpts, ...options };
        return this.options;
    }

    async start(): Promise<void> {
        this.server = new Server(this.options.serverOpts);
        const defer = lang.defer();
        this.server.once(ev.ERROR, (err: any) => {
            if (err?.code === ev.EADDRINUSE || err?.code === ev.ECONNREFUSED) {
                defer.reject(err);
            } else {
                this.logger.error(err);
            }
        });

        this.server.on(ev.CONNECTION, socket => {
            defer.resolve();
            this.createObservable(socket)
                .subscribe(pk => {
                    this.requestHandler(new TcpServRequest(socket, pk), new TcpServResponse(socket))
                });
        });

        this.server.listen(this.options.listenOptions);
        await defer.promise;
    }

    protected createObservable(socket: Socket): Observable<Packet> {
        return new Observable((observer: Observer<any>) => {
            const onClose = (err?: any) => {
                if (err) {
                    observer.error(err);
                } else {
                    observer.complete();
                    this.logger.info(socket.address, 'closed');
                }
            }

            const onError = (err: any) => {
                if (err.code !== ev.ECONNREFUSED) {
                    this.logger.error(err);
                }
                observer.error(err);
            };

            let buffer = '';
            let length = -1;
            const headerSplit = this.options.headerSplit!;
            const onData = (data: Buffer | string) => {
                try {
                    buffer += (isString(data) ? data : new TextDecoder().decode(data));
                    if (length === -1) {
                        const i = buffer.indexOf(headerSplit);
                        if (i !== -1) {
                            const rawContentLength = buffer.substring(0, i);
                            length = parseInt(rawContentLength, 10);

                            if (isNaN(length)) {
                                length = -1;
                                buffer = '';
                                throw new TransportError('socket packge error length' + rawContentLength);
                            }
                            buffer = buffer.substring(i + 1);
                        }
                    }
                    let body: any;
                    let rest: string | undefined;
                    if (length >= 0) {
                        const buflen = buffer.length;
                        if (length === buflen) {
                            body = buffer;
                        } else if (buflen > length) {
                            body = buffer.substring(0, length);
                            rest = buffer.substring(length);
                        }
                    }
                    if (body) {
                        body = this.context.get(Deserializer).deserialize<Packet>(body);
                        observer.next(body);
                    }
                    if (rest) {
                        onData(rest);
                    }
                } catch (err: any) {
                    socket.emit(ev.ERROR, err.message);
                    socket.end();
                    observer.error(err);
                }
            };

            const onEnd = () => {
                observer.complete();
            };

            socket.on(ev.CLOSE, onClose);
            socket.on(ev.ERROR, onError);
            socket.on(ev.ABOUT, onError);
            socket.on(ev.TIMEOUT, onError);
            socket.on(ev.DATA, onData);
            socket.on(ev.END, onEnd);

            return () => {
                socket.off(ev.DATA, onData);
                socket.off(ev.END, onEnd);
                socket.off(ev.ERROR, onError);
                socket.off(ev.ABOUT, onError);
                socket.off(ev.TIMEOUT, onError);
                socket.emit(ev.CLOSE);
            }
        });
    }

    protected bindEvent(ctx: TcpContext, cancel: Subscription): void {
        ctx.request.socket.on(ev.TIMEOUT, () => {
            cancel?.unsubscribe();
        })
        ctx.request.socket.on(ev.CLOSE, () => {
            cancel?.unsubscribe();
        });
    }

    protected createContext(request: TcpServRequest, response: TcpServResponse): TcpContext {
        return new TcpContext(this.context.injector, request, response, this as TransportServer, { parent: this.context });
    }

    async close(): Promise<void> {
        if (!this.server) return;
        const defer = lang.defer();
        this.server.close(err => {
            if (err) {
                this.logger.error(err);
                defer.reject(err);
            } else {
                defer.resolve();
            }
        });
        await defer.promise;
    }

}
