import { BadRequestError, BytesPipe, EADDRINUSE, ECONNREFUSED, ExecptionTypedRespond, Protocol, Router, TransportServer } from '@tsdi/core';
import { Inject, Injectable, InvocationContext, isBoolean, lang, Nullable, Providers } from '@tsdi/ioc';
import { LISTEN_OPTS } from '@tsdi/platform-server';
import { Server } from 'net';
import { Subscription } from 'rxjs';
import { JsonDecoder, JsonEncoder } from '../../coder';
import { ev, hdr, identity } from '../../consts';
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
import { TcpExecptionTypedRespond, TcpRespondAdapter } from './respond';
import { TcpServResponse } from './response';
import { db } from '../../impl/mimedb';
import { DefaultStatusFormater } from '../../interceptors/formater';
import { TcpArgumentErrorFilter, TcpFinalizeFilter } from './finalize-filter';
import { TcpServerOpts, TCP_SERV_INTERCEPTORS } from './options';
import { PacketProtocol, PacketProtocolOpts } from '../packet';
import { TcpProtocol } from '../protocol';


const defOpts = {
    encoding: 'utf8',
    delimiter: '\r\n',
    sizeLimit: 10 * 1024 * 1024,
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
    listenOpts: {
    }
} as TcpServerOpts;


/**
 * TCP server. server of `tcp` or `ipc`. 
 */
@Injectable()
@Providers([
    { provide: ResponseStatusFormater, useClass: DefaultStatusFormater, asDefault: true },
    { provide: RespondAdapter, useClass: TcpRespondAdapter, asDefault: true },
    { provide: ExecptionTypedRespond, useClass: TcpExecptionTypedRespond, asDefault: true },
    { provide: ContentSendAdapter, useClass: TransportSendAdapter, asDefault: true },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter, asDefault: true },
    { provide: Negotiator, useClass: TransportNegotiator, asDefault: true },
    { provide: Protocol, useClass: TcpProtocol, asDefault: true }
])
export class TcpServer extends TransportServer<TcpServRequest, TcpServResponse, TcpContext> {

    get proxy(): boolean {
        return this.options.proxy === true;
    }

    private server?: Server;
    private options!: TcpServerOpts;
    constructor(@Inject() readonly context: InvocationContext, @Nullable() options: TcpServerOpts) {
        super(context, options)
    }

    protected override initOption(options: TcpServerOpts): TcpServerOpts {
        const listenOptions = { ...defOpts.listenOpts, ...options?.listenOpts };
        const opts = this.options = { ...defOpts, ...options, listenOpts: listenOptions };
        this.context.setValue(TcpServerOpts, this.options);
        this.context.setValue(PacketProtocolOpts, this.options);

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

        this.context.setValue(LISTEN_OPTS, this.options.listenOpts);
        return opts;
    }

    async start(): Promise<void> {
        this.server = new Server(this.options.serverOpts);
        if (this.options.maxConnections) {
            this.server.maxConnections = this.options.maxConnections
        }
        const defer = lang.defer();
        this.server.once(ev.ERROR, (err: any) => {
            if (err?.code === EADDRINUSE || err?.code === ECONNREFUSED) {
                defer.reject(err);
            } else {
                this.logger.error(err);
            }
        });

        this.server.on(ev.CONNECTION, socket => {

            const isIPC = !!this.options.listenOpts.path;
            if (isIPC) {
                this.logger.info('Ipc client connection')
            } else {
                this.logger.info('Tcp client', socket.remoteFamily, socket.remoteAddress, socket.remotePort, 'connection');
            }
            const onClose = (err?: any) => {
                if (err) {
                    if (err.code !== ECONNREFUSED) {
                        this.logger.error(err);
                    }
                    socket.end();
                }
                if (isIPC) {
                    this.logger.info('Ipc client disconnected')
                } else {
                    this.logger.info('Tcp client', socket.remoteFamily, socket.remoteAddress, socket.remotePort, 'disconnected');
                }
            }
            socket.on(ev.CLOSE, onClose);
            socket.on(ev.END, onClose);
            const protocol = this.context.get(PacketProtocol);
            protocol.read(socket)
                .subscribe(pk => {
                    if (pk.id && pk.headers) {
                        let length = 0;
                        const len = pk.headers[hdr.CONTENT_LENGTH] as number ?? 0;
                        const hdrcode = pk.headers[hdr.CONTENT_ENCODING] as string || identity;
                        if (len && hdrcode === identity) {
                            length = ~~len
                        }
                        if (this.options.sizeLimit && length > this.options.sizeLimit) {
                            const pipe = this.context.get(BytesPipe);
                            const msg = `Packet size limit ${pipe.transform(this.options.sizeLimit)}, this request packet size ${pipe.transform(len)}`;
                            socket.emit(ev.ERROR, msg);
                            throw new BadRequestError(msg);
                        }
                        this.requestHandler(new TcpServRequest(protocol, socket, pk), new TcpServResponse(socket, pk.id!))
                    }
                });
        });

        this.server.listen(this.options.listenOpts, defer.resolve);
        await defer.promise;
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
