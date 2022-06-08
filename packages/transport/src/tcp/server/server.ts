import { CustomEndpoint, EndpointBackend, ExecptionFilter, Interceptor, InterceptorInst, InterceptorType, MiddlewareInst, MiddlewareType, ServerOptions, TransportServer } from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, lang, Nullable, Token, tokenId, Type } from '@tsdi/ioc';
import { Server, ListenOptions } from 'net';
import { of, Subscription } from 'rxjs';
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
export abstract class TcpServerOptions implements ServerOptions<TcpServRequest, TcpServResponse> {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    /**
     * socket timeout.
     */
    abstract timeout?: number;
    abstract encoding?: BufferEncoding;
    abstract serverOpts?: TcpServerOpts | undefined;
    abstract listenOptions: ListenOptions;
    abstract interceptors?: InterceptorType<TcpServRequest, TcpServResponse>[];
    abstract execptions?: Type<ExecptionFilter>[];
    abstract middlewares?: MiddlewareType[];
}

const defOpts = {
    json: true,
    encoding: 'utf8',
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
 * Tcp server interceptors.
 */
export const TCP_SERV_INTERCEPTORS = tokenId<Interceptor<TcpServRequest, TcpServResponse>[]>('TCP_SERV_INTERCEPTORS');

/**
 * TCP server.
 */
@Injectable()
export class TcpServer extends TransportServer<TcpServRequest, TcpServResponse, TcpContext> {


    private server?: Server;
    private options: TcpServerOptions;
    constructor(
        @Inject() readonly context: InvocationContext,
        @Nullable() options: TcpServerOptions) {
        super()
        this.options = { ...defOpts, ...options };
        this.initialize(this.options);

    }

    getExecptionsToken(): Token<ExecptionFilter[]> {
        return TCP_EXECPTION_FILTERS;
    }

    protected getInterceptorsToken(): Token<InterceptorInst<TcpServRequest, TcpServResponse>[]> {
        return TCP_SERV_INTERCEPTORS;
    }
    protected getMiddlewaresToken(): Token<MiddlewareInst<TcpContext>[]> {
        return TCP_MIDDLEWARES;
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

        this.server.on(ev.CONNECTION, socket => this.requestHandler(new TcpServRequest(socket), new TcpServResponse(socket)));

        this.server.listen(this.options.listenOptions, defer.resolve);
        await defer.promise;
    }

    protected getBackend(): EndpointBackend<TcpServRequest, TcpServResponse> {
        return new CustomEndpoint<TcpServRequest, TcpServResponse>((req, ctx) => of((ctx as TcpContext).response))
    }

    protected bindEvent(ctx: TcpContext, cancel: Subscription): void {
        ctx.request.socket.on(ev.TIMEOUT,()=> {
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
