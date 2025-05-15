import { ArgumentException, Exception, Injector, InvocationContext, ProvdierOf, createContext, getType } from '@tsdi/ioc';
import { BackendFn, ConfigableHandler, ApplicationInterceptorFn, normalizeConfigableHandlerOptions } from '@tsdi/core';
import { ForbiddenException } from '@tsdi/common/transport';
import { lastValueFrom } from 'rxjs';
import { RequestContext } from '../RequestContext';
import { AbstractRequestHandler, RequestHandlerOptions } from '../AbstractRequestHandler';
import { RequestHandler } from '../RequestHandler';
import { MiddlewareLike } from '../middleware/middleware';
import { middlewareBackendFactory } from '../middleware/middleware.compose';


/**
 * Request handler.
 * 
 * 传输节点
 */
export class DefaultRequestHandler<TInput extends RequestContext = RequestContext, TOptions extends RequestHandlerOptions<TInput> = RequestHandlerOptions<TInput>>
    extends ConfigableHandler<TInput, any, TOptions> implements AbstractRequestHandler<TInput, TOptions> {

    use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this {
        if(!this.options.middlewaresToken) throw new ArgumentException('middlewaresToken config is missing');
        this.regMulti(this.options.middlewaresToken, middlewares, order);
        this.reset();
        return this;
    }

    protected override getChain(input: TInput): ApplicationInterceptorFn<TInput, any> {
        return this.getChainOf(getType(input.request)) ?? super.getChain(input);
    }

    protected override getBackend(): BackendFn<TInput> {
        const middlewares = this.getMiddlewares();
        const bkfn = super.getBackend();
        if (middlewares?.length) {
            return middlewareBackendFactory([...middlewares, async (ctx, next) => {
                await lastValueFrom(bkfn(ctx));
                await next();
            }]);
        }
        return bkfn;
    }

    protected getMiddlewares() {
        return this.options.middlewaresToken? this.injector.get(this.options.middlewaresToken!, null) : null;
    }

    protected override forbiddenError(): Exception {
        return new ForbiddenException()
    }
}



/**
 * create request handler.
 * 
 * 创建传输节点处理器实例化对象
 * @param context 
 * @param options 
 * @returns 
 */
export function createRequestHandler<TInput extends RequestContext>(context: Injector | InvocationContext, options: RequestHandlerOptions<TInput>): RequestHandler<TInput> {
    options = normalizeConfigableHandlerOptions(options);
    const Type = options.classType ?? DefaultRequestHandler;
    return new Type(createContext(context, options, options.handlerType), options);
}

