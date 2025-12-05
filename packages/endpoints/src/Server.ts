import { Abstract, InvocationContext, isArray, ProvdierOf, toMutilProvdierOf } from '@tsdi/ioc';
import { ApplicationEvent, HandlerAppendService, Runner, Shutdown, HandlerOptions, isHandlerOptions } from '@tsdi/core';
import { RequestHandler, RequestInterceptorLike, Transport } from '@tsdi/common';
import { AbstractRequestContext } from './AbstractRequestContext';
import { AbstractRequestHandler } from './AbstractRequestHandler';
import { ServiceConfig } from './server.options';
// import { RequestHandler } from './RequestHandler';
// import { TOutgoing } from '@tsdi/common/transport';


/**
 * microservice.
 */
@Abstract()
export abstract class MicroService<TRequest extends AbstractRequestContext = AbstractRequestContext> {

    /**
     * context
     */
    abstract get context(): InvocationContext;
    /**
     * micro service handler
     */
    abstract get handler(): RequestHandler<TRequest>;

    @Runner()
    async start() {
        if (this.context.ready) await this.context.ready;
        return await this.onStart()
    }

    @Shutdown()
    async close() {
        await this.onShutdown();
        this.handler.onDestroy?.();
    }

    protected abstract onStart(): Promise<any>;

    protected abstract onShutdown(): Promise<any>;

}


/**
 * abstract server.
 * 
 * 微服务
 */
@Abstract()
export abstract class Server<TRequest extends AbstractRequestContext = AbstractRequestContext, TOptions extends ServiceConfig = ServiceConfig> extends MicroService implements HandlerAppendService<TRequest> {

    /**
     * service request handler.
     */
    abstract get handler(): AbstractRequestHandler<TRequest>;


    use(options: ProvdierOf<RequestInterceptorLike<TRequest>> | ProvdierOf<RequestInterceptorLike>[] | HandlerOptions<TRequest>, order?: number): this {
            this.handler.append(
                isArray(options) ? { interceptors: options }
                    : ((isHandlerOptions(options) ? options : { interceptors: [toMutilProvdierOf(options as ProvdierOf<RequestInterceptorLike>, order)] }))
            )
            return this;
        }

}

/**
 *  bind Server event.
 */
export class BindServerEvent<T = any> extends ApplicationEvent {

    constructor(readonly server: T, readonly transport: Transport, target: any) {
        super(target)
    }

}