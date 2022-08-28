import { Router, ExecptionFilter, MiddlewareLike } from '@tsdi/core';
import { Injectable, Nullable, tokenId } from '@tsdi/ioc';
import {
    TransportExecptionFilter, CatchInterceptor, LogInterceptor, RespondInterceptor,
    BodyparserMiddleware, ContentMiddleware, EncodeJsonMiddleware, SessionMiddleware,
    TransportServer, TransportContext, TransportFinalizeFilter
} from '@tsdi/transport';
import { TcpServerOpts, TCP_SERV_INTERCEPTORS } from './options';
import { TcpProtocol } from '../protocol';
import { TcpServerBuilder } from './builder';


/**
 * TCP Middlewares.
 */
export const TCP_MIDDLEWARES = tokenId<MiddlewareLike<TransportContext>[]>('TCP_MIDDLEWARES');
/**
 * TCP execption filters.
 */
export const TCP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');

/**
 * tcp server default options.
 */
export const TCP_SERVER_OPTS = {
    builder: TcpServerBuilder,
    transport: TcpProtocol,
    interceptorsToken: TCP_SERV_INTERCEPTORS,
    execptionsToken: TCP_EXECPTION_FILTERS,
    middlewaresToken: TCP_MIDDLEWARES,
    content: {
        root: 'public'
    },
    connectionOpts: {
        delimiter: '\r\n',
        maxSize: 10 * 1024 * 1024,
    },
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
    ],
    serverOpts: {
        host: 'localhost',
        port: 3000,
    },
    execptions: [
        TransportFinalizeFilter,
        TransportExecptionFilter
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

// export const TCP_SERV_PROVIDERS: ProviderType[] = [
//     { provide: RespondAdapter, useClass: TransportRespondAdapter },
//     { provide: TransportStatus, useClass: TcpStatus },
//     { provide: TransportProtocol, useClass: TcpProtocol }
// ]

/**
 * TCP server. server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpServer extends TransportServer {

    // get proxy(): boolean {
    //     return this.getOptions().proxy === true;
    // }

    // private server?: Server;

    constructor(@Nullable() options: TcpServerOpts) {
        super(options)
    }

    protected override getDefaultOptions() {
        return TCP_SERVER_OPTS;
    }

    // protected override initOption(options: TcpServerOpts): TcpServerOpts {
    //     const listenOptions = { ...defOpts.listenOpts, ...options?.listenOpts };
    //     const providers = options && options.providers ? [...TCP_SERV_PROVIDERS, options.providers] : TCP_SERV_PROVIDERS;
    //     const opts = { ...defOpts, ...options, listenOpts: listenOptions, providers };

    //     if (opts.middlewares) {
    //         opts.middlewares = opts.middlewares.filter(m => {
    //             if (!opts.session && m === SessionMiddleware) return false;
    //             if (!opts.content && m === ContentMiddleware) return false;
    //             return true
    //         });
    //     }

    //     return opts as TcpServerOpts;
    // }

    // protected override initContext(options: TcpServerOpts): void {
    //     this.context.setValue(TcpServerOpts, options);
    //     this.context.setValue(PacketProtocolOpts, options);

    //     if (options.content && !isBoolean(options.content)) {
    //         this.context.setValue(ContentOptions, options.content)
    //     }

    //     if (options.mimeDb) {
    //         const mimedb = this.context.injector.get(MimeDb);
    //         mimedb.from(options.mimeDb)
    //     }

    //     this.context.setValue(LISTEN_OPTS, options.listenOpts);
    //     super.initContext(options);
    // }

    // async start(): Promise<void> {
    //     const opts = this.getOptions();
    //     this.server = new Server(opts.serverOpts);

    //     if (opts.maxConnections) {
    //         this.server.maxConnections = opts.maxConnections
    //     }
    //     const defer = lang.defer();
    //     this.server.once(ev.ERROR, (err: any) => {
    //         if (err?.code === EADDRINUSE || err?.code === ECONNREFUSED) {
    //             defer.reject(err);
    //         } else {
    //             this.logger.error(err);
    //         }
    //     });

    //     this.server.on(ev.CONNECTION, socket => {

    //         const isIPC = !!opts.listenOpts.path;
    //         if (isIPC) {
    //             this.logger.info('Ipc client connection')
    //         } else {
    //             this.logger.info('Tcp client', socket.remoteFamily, socket.remoteAddress, socket.remotePort, 'connection');
    //         }
    //         const onClose = (err?: any) => {
    //             if (err) {
    //                 if (err.code !== ECONNREFUSED) {
    //                     this.logger.error(err);
    //                 }
    //                 socket.end();
    //             }
    //             if (isIPC) {
    //                 this.logger.info('Ipc client disconnected')
    //             } else {
    //                 this.logger.info('Tcp client', socket.remoteFamily, socket.remoteAddress, socket.remotePort, 'disconnected');
    //             }
    //         }
    //         socket.on(ev.CLOSE, onClose);
    //         socket.on(ev.END, onClose);
    //         const protocol = this.context.get(PacketProtocol);
    //         protocol.read(socket)
    //             .subscribe(pk => {
    //                 if (pk.id && pk.headers) {
    //                     let length = 0;
    //                     const len = pk.headers[hdr.CONTENT_LENGTH] as number ?? 0;
    //                     const hdrcode = pk.headers[hdr.CONTENT_ENCODING] as string || identity;
    //                     if (len && hdrcode === identity) {
    //                         length = ~~len
    //                     }
    //                     if (opts.sizeLimit && length > opts.sizeLimit) {
    //                         const pipe = this.context.get(BytesPipe);
    //                         const msg = `Packet size limit ${pipe.transform(opts.sizeLimit)}, this request packet size ${pipe.transform(len)}`;
    //                         socket.emit(ev.ERROR, msg);
    //                         throw new BadRequestError(msg);
    //                     }
    //                     this.onRequestHandler(new TcpServRequest(protocol, socket, pk), new TcpServResponse(socket, pk.id!))
    //                 }
    //             });
    //     });

    //     this.server.listen(opts.listenOpts, defer.resolve);
    //     await defer.promise;
    // }

    // /**
    //  * request handler.
    //  * @param request 
    //  * @param response 
    //  */
    //  protected onRequestHandler(request: TcpServRequest, response: TcpServResponse) {
    //     const ctx = new TcpContext(this.context.injector, request, response, this as Server, { parent: this.context });
    //     this.context.injector.get(TcpHandlerBinding).binding(ctx, this.endpoint());
    // }



    // async close(): Promise<void> {
    //     if (!this.server) return;
    //     const defer = lang.defer();
    //     this.server.close(err => {
    //         if (err) {
    //             this.logger.error(err);
    //             defer.reject(err);
    //         } else {
    //             defer.resolve();
    //         }
    //     });
    //     await defer.promise;
    // }

}
