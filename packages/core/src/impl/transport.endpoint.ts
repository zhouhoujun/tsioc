import { Injector, ProvdierOf, Token, lang, refl } from '@tsdi/ioc';
import { Backend } from '../Handler';
import { GUARDS_TOKEN } from '../guard';
import { INTERCEPTORS_TOKEN } from '../Interceptor';
import { FILTERS_TOKEN } from '../filters/filter';
import { AbstractGuardHandler } from '../handlers/guards';
import { TransportContext } from '../transport/context';
import { MIDDLEWARES_TOKEN, MiddlewareLike } from '../transport/middleware';
import { MiddlewareBackend } from '../transport/middleware.compose';
import { TransportEndpoint, TransportEndpointOptions } from '../transport/endpoint';
import { setHandlerOptions } from '../handlers';


export class TransportEndpointImpl<TInput extends TransportContext = TransportContext, TOutput = any>
    extends AbstractGuardHandler<TInput, TOutput> implements TransportEndpoint<TInput, TOutput> {

    protected midddlesToken: Token<MiddlewareLike<TInput>[]>;

    constructor(
        injector: Injector,
        options: TransportEndpointOptions<TInput>) {
        super(injector,
            options.interceptorsToken ?? INTERCEPTORS_TOKEN,
            options.guardsToken ?? GUARDS_TOKEN,
            options.filtersToken ?? FILTERS_TOKEN);
        this.midddlesToken = options.middlewaresToken ?? MIDDLEWARES_TOKEN;
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