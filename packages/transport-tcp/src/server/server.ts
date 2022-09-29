import { Router, ExecptionFilter, MiddlewareLike, ListenOpts } from '@tsdi/core';
import { Injectable, lang, Nullable, tokenId } from '@tsdi/ioc';
import {
    TransportExecptionFilter, CatchInterceptor, LogInterceptor, RespondInterceptor,
    BodyparserMiddleware, ContentMiddleware, EncodeJsonMiddleware, SessionMiddleware,
    TransportServer, TransportContext, TransportFinalizeFilter
} from '@tsdi/transport';
import { TcpServerOpts, TCP_SERV_INTERCEPTORS } from './options';
import { DelimiterTransportStrategy } from '../transport';
import * as net from 'net';
import * as tls from 'tls';


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
    transport: {
        strategy: DelimiterTransportStrategy
    },
    interceptorsToken: TCP_SERV_INTERCEPTORS,
    execptionsToken: TCP_EXECPTION_FILTERS,
    middlewaresToken: TCP_MIDDLEWARES,
    content: {
        root: 'public'
    },
    connectionOpts: {
        delimiter: '\r\n',
        maxSize: 10 * 1024 * 1024
    },
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
    ],
    serverOpts: {
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


/**
 * TCP server. server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpServer extends TransportServer<net.Server | tls.Server, TcpServerOpts> {


    constructor(@Nullable() options: TcpServerOpts) {
        super(options)
    }

    protected override getDefaultOptions() {
        return TCP_SERVER_OPTS;
    }

    protected createServer(opts: TcpServerOpts): net.Server | tls.Server {
        return (opts.serverOpts as tls.TlsOptions).cert ? tls.createServer(opts.serverOpts as tls.TlsOptions) : net.createServer(opts.serverOpts as net.ServerOpts)
    }

    protected listen(server: net.Server | tls.Server, opts: ListenOpts): Promise<void> {
        const defer = lang.defer<void>();
        server.listen(opts, defer.resolve);
        return defer.promise;
    }

}
