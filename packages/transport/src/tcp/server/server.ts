import { Decoder, ExecptionRespondTypeAdapter, Packet, Router, TransportError, TransportServer, TransportStatus, UuidGenerator } from '@tsdi/core';
import { Inject, Injectable, InvocationContext, isBoolean, isString, lang, Nullable, Providers } from '@tsdi/ioc';
import { Server, Socket } from 'net';
import { Observable, Observer, Subscription } from 'rxjs';
import { JsonDecoder, JsonEncoder } from '../../coder';
import { ev, hdr } from '../../consts';
import { TrasportMimeAdapter } from '../../impl/mime';
import { TransportNegotiator } from '../../impl/negotiator';
import { TransportSendAdapter } from '../../impl/send';
import { CatchInterceptor, LogInterceptor, RespondAdapter, RespondInterceptor, ResponseStatusFormater } from '../../interceptors';
import { BodyparserMiddleware, ContentMiddleware, ContentOptions, EncodeJsonMiddleware, SessionMiddleware } from '../../middlewares';
import { ContentSendAdapter } from '../../middlewares/send';
import { MimeAdapter, MimeDb } from '../../mime';
import { Negotiator } from '../../negotiator';
import { TcpContext, TCP_EXECPTION_FILTERS, TCP_MIDDLEWARES } from './context';
import { TcpServRequest } from './request';
import { TcpExecptionRespondTypeAdapter, TcpRespondAdapter } from './respond';
import { TcpServResponse } from './response';
import { db } from '../../impl/mimedb';
import { HttpStatus } from '../../http/status';
import { DefaultStatusFormater } from '../../interceptors/formater';
import { TcpArgumentErrorFilter, TcpFinalizeFilter } from './finalize-filter';
import { TcpServerOptions, TCP_SERV_INTERCEPTORS } from './options';


const defOpts = {
    encoding: 'utf8',
    delimiter: '\r\n',
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
    middlewares: [
        ContentMiddleware,
        SessionMiddleware,
        EncodeJsonMiddleware,
        BodyparserMiddleware,
        Router
    ],
    listenOptions: {
    }
} as TcpServerOptions;


/**
 * TCP server. server of `tcp` or `ipc`. 
 */
@Injectable()
@Providers([
    { provide: ResponseStatusFormater, useClass: DefaultStatusFormater, asDefault: true },
    { provide: RespondAdapter, useClass: TcpRespondAdapter, asDefault: true },
    { provide: ExecptionRespondTypeAdapter, useClass: TcpExecptionRespondTypeAdapter, asDefault: true },
    { provide: ContentSendAdapter, useClass: TransportSendAdapter, asDefault: true },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter, asDefault: true },
    { provide: Negotiator, useClass: TransportNegotiator, asDefault: true },
    { provide: TransportStatus, useClass: HttpStatus, asDefault: true }
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
        const isIPC = !!this.options.listenOptions.path;
        if (isIPC) {
            this.logger.info('Ipc client connection')
        } else {
            this.logger.info('Tcp client', socket.remoteFamily, socket.remoteAddress, socket.remotePort, 'connection');
        }
        return new Observable((observer: Observer<any>) => {
            const onClose = (err?: any) => {
                if (err) {
                    observer.error(err);
                } else {
                    observer.complete();
                    if (isIPC) {
                        this.logger.info('Ipc client disconnected')
                    } else {
                        this.logger.info('Tcp client', socket.remoteFamily, socket.remoteAddress, socket.remotePort, 'disconnected');
                    }
                }
            }

            const onError = (err: any) => {
                if (err.code !== ev.ECONNREFUSED) {
                    this.logger.error(err);
                }
                socket.end();
                observer.error(err);
            };

            let buffer = '';
            const delimiter = this.options.delimiter!;
            const uuidgr = this.context.resolve(UuidGenerator);
            const onData = (data: Buffer | string) => {
                try {
                    buffer += (isString(data) ? data : new TextDecoder().decode(data));
                    buffer += (isString(data) ? data : new TextDecoder().decode(data));
                    const idx = buffer.indexOf(delimiter);
                    if (idx <= 0) {
                        if (idx === 0) {
                            buffer = '';
                        }
                        return;
                    }

                    let rest: string | undefined;

                    const pkg = buffer.substring(0, idx);
                    if (idx < buffer.length - 1) {
                        rest = buffer.substring(idx + 1);
                    }
                    if (pkg) {
                        buffer = '';
                        const pktype = parseInt(pkg.slice(0, 1));
                        const pidx = uuidgr.uuidLen + 1;
                        const id = pkg.slice(1, pidx);
                        if (pktype == 0) {
                            const packet = this.context.get(Decoder).decode(pkg.slice(pidx));
                            observer.next({ ...packet, id });
                        } else if (pktype == 1) {
                            const body = pkg.slice(pidx);
                            observer.next({ id, body });
                        }
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
