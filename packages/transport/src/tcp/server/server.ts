import { Decoder, ExecptionRespondTypeAdapter, Interceptor, Packet, Router, ServerOptions, TransportError, TransportServer } from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, isBoolean, isString, lang, Nullable, Providers, tokenId } from '@tsdi/ioc';
import { Server, ListenOptions, Socket, ServerOpts as TcpServerOpts } from 'net';
import { Observable, Observer, Subscription } from 'rxjs';
import { JsonDecoder, JsonEncoder } from '../../coder';
import { ev, hdr } from '../../consts';
import { TrasportMimeAdapter } from '../../impl/mime';
import { TransportNegotiator } from '../../impl/negotiator';
import { TransportSendAdapter } from '../../impl/send';
import { CatchInterceptor, LogInterceptor, RespondAdapter, RespondInterceptor, ResponseStatusFormater } from '../../interceptors';
import { BodyparserMiddleware, ContentMiddleware, ContentOptions, EncodeJsonMiddleware, SessionMiddleware, SessionOptions } from '../../middlewares';
import { ContentSendAdapter } from '../../middlewares/send';
import { MimeAdapter, MimeDb, MimeSource } from '../../mime';
import { Negotiator } from '../../negotiator';
import { TcpContext, TCP_EXECPTION_FILTERS, TCP_MIDDLEWARES } from './context';
import { TcpStatusFormater } from './formater';
import { TcpServRequest } from './request';
import { TcpExecptionRespondTypeAdapter, TcpRespondAdapter } from './respond';
import { TcpServResponse } from './response';
import { db } from '../../impl/mimedb';
import { TcpArgumentErrorFilter, TcpFinalizeFilter } from './finalize-filter';


/**
 * TCP server options.
 */
@Abstract()
export abstract class TcpServerOptions extends ServerOptions<TcpServRequest, TcpServResponse> {
    /**
     * header split code.
     */
    abstract headerSplit?: string;
    abstract maxConnections?: number;
    /**
     * socket timeout.
     */
    abstract timeout?: number;
    abstract encoding?: BufferEncoding;
    abstract mimeDb?: Record<string, MimeSource>;
    abstract content?: boolean | ContentOptions;
    abstract session?: boolean | SessionOptions;
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
    encoder: JsonEncoder,
    decoder: JsonDecoder,
    content: {
        root: 'public'
    },
    mimeDb: db,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
    ],
    execptions: [
        TcpFinalizeFilter,
        TcpArgumentErrorFilter
    ],
    middlewares:[
        ContentMiddleware,
        SessionMiddleware,
        EncodeJsonMiddleware,
        BodyparserMiddleware,
        Router
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
@Providers([
    { provide: ResponseStatusFormater, useClass: TcpStatusFormater },
    { provide: RespondAdapter, useClass: TcpRespondAdapter },
    { provide: ExecptionRespondTypeAdapter, useClass: TcpExecptionRespondTypeAdapter },
    { provide: ContentSendAdapter, useClass: TransportSendAdapter },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter },
    { provide: Negotiator, useClass: TransportNegotiator }
])
export class TcpServer extends TransportServer<TcpServRequest, TcpServResponse, TcpContext> {

    private server?: Server;
    private options!: TcpServerOptions;
    constructor(@Inject() readonly context: InvocationContext, @Nullable() options: TcpServerOptions) {
        super(context, options)
    }

    protected override initOption(options: TcpServerOptions): TcpServerOptions {
        const listenOptions = { ...defOpts.listenOptions, ...options?.listenOptions };
        const opts = this.options = { ...defOpts, ...options, listenOptions };
        this.context.setValue(TcpServerOptions, this.options);
        
        if (opts.middlewares) {
            opts.middlewares = opts.middlewares.filter(m => {
                if (!opts.session && m === SessionMiddleware) return false;
                if (!opts.content && m === ContentMiddleware) return false;
                return true
            });
        }

        if (opts.content && !isBoolean(opts.content)) {
            this.context.setValue(ContentOptions, opts.content)
        }

        if (opts.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(opts.mimeDb)
        }
        return opts;
    }

    async start(): Promise<void> {
        this.server = new Server(this.options.serverOpts);
        if (this.options.maxConnections) {
            this.server.maxConnections = this.options.maxConnections
        }
        const defer = lang.defer();
        this.server.once(ev.ERROR, (err: any) => {
            if (err?.code === ev.EADDRINUSE || err?.code === ev.ECONNREFUSED) {
                defer.reject(err);
            } else {
                this.logger.error(err);
            }
        });

        this.server.on(ev.CONNECTION, socket => {
            let headers: Record<string, any>;
            let body = '';
            let len = 0;
            let id: string | undefined;
            this.createObservable(socket)
                .subscribe(pk => {
                    if (pk.headers) {
                        headers = pk.headers;
                        id = pk.id;
                        body = ''
                        len = headers[hdr.CONTENT_LENGTH];
                        if (!len) {
                            this.requestHandler(new TcpServRequest(socket, pk), new TcpServResponse(socket, pk.id))
                        }
                    } else if (pk.id === id) {
                        body += pk.body;
                        if (Buffer.byteLength(body) >= len) {
                            this.requestHandler(new TcpServRequest(socket, { id: pk.id, headers, body }), new TcpServResponse(socket, pk.id));
                            len = -1;
                            body = '';
                        }
                    }
                });
        });

        this.server.listen(this.options.listenOptions, defer.resolve);
        await defer.promise;
    }

    protected createObservable(socket: Socket): Observable<Packet> {
        return new Observable((observer: Observer<any>) => {
            const onClose = (err?: any) => {
                if (err) {
                    observer.error(err);
                } else {
                    observer.complete();
                    this.logger.info(socket.address(), 'closed');
                }
            }

            const onError = (err: any) => {
                if (err.code !== ev.ECONNREFUSED) {
                    this.logger.error(err);
                }
                socket.emit(ev.ERROR, err.message);
                socket.end();
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
                        body = this.context.get(Decoder).decode(body);
                        buffer = '';
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
                socket.end();
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
