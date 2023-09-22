import { ArgumentExecption, Execption, Injector, ProvdierOf, Token, createContext, getClassName, refl } from '@tsdi/ioc';
import { Backend, AbstractGuardHandler, setHandlerOptions } from '@tsdi/core';
import { ForbiddenExecption } from '@tsdi/common';
import { TransportContext } from '../TransportContext';
import { MiddlewareLike } from '../middleware/middleware';
import { MiddlewareBackend } from '../middleware/middleware.compose';
import { MiddlewareEndpoint, MiddlewareEndpointOptions } from '../middleware/middleware.endpoint';



export class MiddlewareEndpointImpl<TInput extends TransportContext = TransportContext, TOutput = any>
    extends AbstractGuardHandler<TInput, TOutput> implements MiddlewareEndpoint<TInput, TOutput> {

    protected midddlesToken: Token<MiddlewareLike<TInput>[]>;

    constructor(
        injector: Injector,
        options: MiddlewareEndpointOptions<TInput>) {
        super(createContext(injector, options),
            options.interceptorsToken!,
            options.guardsToken,
            options.filtersToken);

        if (!options.middlewaresToken) throw new ArgumentExecption(`Middleware token missing of ${getClassName(this)}.`)
        this.midddlesToken = options.middlewaresToken;

        setHandlerOptions(this, options);
        options.middlewares && this.use(options.middlewares)

    }

    use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this {
        this.regMulti(this.midddlesToken, middlewares, order, type => refl.getDef(type).abstract || Reflect.getMetadataKeys(type).length > 0);
        this.reset();
        return this;
    }

    protected override getBackend(): Backend<TInput, TOutput> {
        const middlewares = this.getMiddlewares();
        return new MiddlewareBackend(middlewares);
    }

    protected override forbiddenError(): Execption {
        return new ForbiddenExecption()
    }

    protected getMiddlewares() {
        return this.injector.get(this.midddlesToken);
    }

}
