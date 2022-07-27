import { BadRequestError, BytesPipe, EADDRINUSE, ECONNREFUSED, ExecptionTypedRespond, HandlerBinding, Protocol, Router, TransportServer } from '@tsdi/core';
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
import { TcpHandlerBinding } from './binding';


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
    { provide: Protocol, useClass: TcpProtocol, asDefault: true },
    { provide: HandlerBinding, useClass: TcpHandlerBinding, asDefault: true }
])
export class TcpServer extends TransportServer<TcpServRequest, TcpServResponse, TcpContext, TcpServerOpts> {

    get proxy(): boolean {
        return this.getOptions().proxy === true;
    }

    private server?: Server;
    constructor(@Nullable() options: TcpServerOpts) {
        super(options)
    }

    protected override initOption(options: TcpServerOpts): TcpServerOpts {
        const listenOptions = { ...defOpts.listenOpts, ...options?.listenOpts };
        const opts = { ...defOpts, ...options, listenOpts: listenOptions };

        if (opts.middlewares) {
            opts.middlewares = opts.middlewares.filter(m => {
                if (!opts.session && m === SessionMiddleware) return false;
                if (!opts.content && m === ContentMiddleware) return false;
                return true
            });
        }

        return opts;
    }

    protected override initContext(options: TcpServerOpts): void {
        this.context.setValue(TcpServerOpts, options);
        this.context.setValue(PacketProtocolOpts, options);

        if (options.content && !isBoolean(options.content)) {
            this.context.setValue(ContentOptions, options.content)
        }

        if (options.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(options.mimeDb)
        }

        this.context.setValue(LISTEN_OPTS, options.listenOpts);
        super.initContext(options);
    }

    async start(): Promise<void> {
        const opts = this.getOptions();
        this.server = new Server(opts.serverOpts);
        if (opts.maxConnections) {
            this.server.maxConnections = opts.maxConnections
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

            const isIPC = !!opts.listenOpts.path;
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
                        if (opts.sizeLimit && length > opts.sizeLimit) {
                            const pipe = this.context.get(BytesPipe);
                            const msg = `Packet size limit ${pipe.transform(opts.sizeLimit)}, this request packet size ${pipe.transform(len)}`;
                            socket.emit(ev.ERROR, msg);
                            throw new BadRequestError(msg);
                        }
                        this.onRequestHandler(new TcpServRequest(protocol, socket, pk), new TcpServResponse(socket, pk.id!))
                    }
                });
        });

        this.server.listen(opts.listenOpts, defer.resolve);
        await defer.promise;
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
