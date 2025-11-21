import { Abstract, isArray, ProvdierOf, StaticProvider, toMutilProvdierOf } from '@tsdi/ioc';
import { ApplicationEvent, CanHandle, Filter, HandlerAppendService, PipeTransform, Runner, Shutdown, InterceptorLike, RequestInterceptorLike, HandlerOptions, isHandlerOptions } from '@tsdi/core';
import { CommonProtocols } from '@tsdi/common';
import { RequestContext } from './RequestContext';
import { AbstractRequestHandler } from './AbstractRequestHandler';
import { RequestHandler } from './RequestHandler';
import { ServiceConfig } from './server.options';
import { TOutgoing } from '@tsdi/common/transport';


/**
 * microservice.
 */
@Abstract()
export abstract class MicroService<TRequest extends RequestContext = RequestContext> {

    /**
     * micro service handler
     */
    abstract get handler(): RequestHandler<TRequest>;

    @Runner()
    async start() {
        if (this.handler.ready) await this.handler.ready;
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
export abstract class Server<TRequest extends RequestContext = RequestContext, TOptions extends ServiceConfig = ServiceConfig> extends MicroService implements HandlerAppendService<TRequest> {

    /**
     * service request handler.
     */
    abstract get handler(): AbstractRequestHandler<TRequest, TOptions>;

    getOptions(): TOptions {
        return this.handler.getOptions()
    }



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

    constructor(readonly server: T, readonly transport: CommonProtocols, target: any) {
        super(target)
    }

}