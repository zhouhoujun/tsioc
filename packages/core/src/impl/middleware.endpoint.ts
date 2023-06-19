import { ArgumentExecption, Injector, ProvdierOf, Token, createContext, getClassName, refl } from '@tsdi/ioc';
import { Backend } from '../Handler';
import { AbstractGuardHandler } from '../handlers/guards';
import { AssetContext } from '../transport/context';
import { MiddlewareLike } from '../transport/middleware';
import { MiddlewareBackend } from '../transport/middleware.compose';
import { MiddlewareEndpoint, MiddlewareEndpointOptions } from '../transport/endpoint';
import { setHandlerOptions } from '../handlers/handler.service';


export class MiddlewareEndpointImpl<TInput extends AssetContext = AssetContext, TOutput = any>
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

    protected getMiddlewares() {
        return this.injector.get(this.midddlesToken);
    }

}
