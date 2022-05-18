import { EndpointBackend, ExecptionFilter, Interceptor, InterceptorInst, InterceptorType, MiddlewareInst, MiddlewareType, ServerOptions, TransportContext, TransportServer, UuidGenerator } from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, lang, Nullable, Token, tokenId, Type } from '@tsdi/ioc';
import { Server, ListenOptions } from 'node:net';
import { Subscription } from 'rxjs';
import { ev } from '../consts';
import { TcpContext, TCP_EXECPTION_FILTERS, TCP_MIDDLEWARES } from './context';
import { TcpRequest, TcpResponse } from './packet';



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


@Abstract()
export abstract class TcpServerOptions implements ServerOptions<TcpRequest, TcpResponse> {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract serverOpts?: TcpServerOpts | undefined;
    abstract listenOptions: ListenOptions;
    abstract interceptors?: InterceptorType<TcpRequest, TcpResponse>[];
    abstract execptions?: Type<ExecptionFilter>[];
    abstract middlewares?: MiddlewareType[];
}

const defOpts = {
    json: true,
    listenOptions: {
        port: 3000,
        host: 'localhost'
    }
} as TcpServerOptions;

export const TCP_SERV_INTERCEPTORS = tokenId<Interceptor<TcpRequest, TcpResponse>[]>('TCP_SERV_INTERCEPTORS');

/**
 * TCP server.
 */
@Injectable()
export class TcpServer extends TransportServer<TcpRequest, TcpResponse, TcpContext> {


    private server?: Server;
    private options: TcpServerOptions;
    constructor(
        @Inject() readonly context: InvocationContext,
        @Nullable() options: TcpServerOptions) {
        super()
        this.options = { ...defOpts, ...options };
        this.initialize(this.options);

    }

    protected getInterceptorsToken(): Token<InterceptorInst<TcpRequest, TcpResponse>[]> {
        return TCP_SERV_INTERCEPTORS;
    }
    protected getMiddlewaresToken(): Token<MiddlewareInst<TcpContext>[]> {
        return TCP_MIDDLEWARES;
    }

    protected getExecptionsToken(): Token<ExecptionFilter[]> {
        return TCP_EXECPTION_FILTERS;
    }

    async start(): Promise<void> {
        this.server = new Server(this.options.serverOpts);
        const defer = lang.defer();
        this.server.once(ev.ERROR, (err: any)=> {
            if(err?.code === ev.EADDRINUSE || err?.code === ev.ECONNREFUSED) {
                defer.reject(err);
            } else {
                this.logger.error(err);
            }
        });
        this.server.listen(this.options.listenOptions, defer.resolve);
        await defer.promise;
    }

    protected getBackend(): EndpointBackend<TcpRequest, TcpResponse> {
        throw new Error('Method not implemented.');
    }

    protected bindEvent(ctx: TcpContext, cancel: Subscription): void {
        ctx.request.socket.on(ev.CLOSE, () => {
            cancel?.unsubscribe();
        });
    }

    protected createContext(request: TcpRequest, response: TcpResponse): TcpContext {
        return new TcpContext(this.context.injector, request, response, this, { parent: this.context });
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
