import { Injector, ProvdierOf, Token, lang } from '@tsdi/ioc';
import { Backend } from '../Handler';
import { GUARDS_TOKEN } from '../guard';
import { INTERCEPTORS_TOKEN } from '../Interceptor';
import { FILTERS_TOKEN } from '../filters/filter';
import { AbstractGuardHandler } from '../handlers/guards';
import { TransportContext } from '../transport/context';
import { MIDDLEWARES_TOKEN, MiddlewareLike } from '../transport/middleware';
import { MiddlewareBackend } from '../transport/middleware.compose';
import { TransportEndpoint, TransportEndpointOptions } from '../transport/transport.endpoint';


export class TransportEndpointImpl<TCtx extends TransportContext = TransportContext, TOutput = any>
    extends AbstractGuardHandler<TCtx, TOutput> implements TransportEndpoint<TCtx, TOutput> {

    protected midddlesToken: Token<MiddlewareLike[]>;

    constructor(
        injector: Injector,
        options: TransportEndpointOptions<TCtx>) {
        super(injector,
            options.interceptorsToken ?? INTERCEPTORS_TOKEN,
            options.guardsToken ?? GUARDS_TOKEN,
            options.filtersToken ?? FILTERS_TOKEN);
        this.midddlesToken = options.middlewaresToken ?? MIDDLEWARES_TOKEN;

    }

    use(middlewares: ProvdierOf<MiddlewareLike>, order?: number): this {
        this.regMulti(this.midddlesToken, middlewares, order, type => !!lang.getParentClass(type) || Object.getOwnPropertyNames(type).indexOf('invoke') > 0);
        this.reset();
        return this;
    }

    protected override getBackend(): Backend<TCtx, TOutput> {
        const middlewares = this.getMiddlewares();
        return new MiddlewareBackend(middlewares);
    }

    protected getMiddlewares() {
        return this.injector.get(this.midddlesToken);
    }

}