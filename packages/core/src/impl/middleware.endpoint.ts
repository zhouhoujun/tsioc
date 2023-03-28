import { Injector, ProvdierOf, Token } from '@tsdi/ioc';
import { Endpoint } from '../Endpoint';
import { EndpointContext } from '../endpoints';
import { GuardsEndpoint } from '../endpoints/guards.endpoint';
import { Filter } from '../filters/filter';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { MiddlewareLike, MiddlewareProviderOf } from '../transport/middleware';
import { MiddlewareEndpoint } from '../transport/middleware.service';
import { MiddlewareBackend } from '../transport/middleware.compose';


export class MiddlewareEndpointImpl<TCtx extends EndpointContext, TOutput>
    extends GuardsEndpoint<TCtx, TOutput> implements MiddlewareEndpoint<TCtx, TOutput> {

    constructor(
        injector: Injector,
        token: Token<Interceptor<TCtx, TOutput>[]>,
        private midddlesToken: Token<MiddlewareLike[]>,
        guardsToken?: Token<CanActivate[]>,
        filtersToken?: Token<Filter<TCtx, TOutput>[]>) {
        super(injector, token, null!, guardsToken, filtersToken);

    }

    use(middlewares: MiddlewareProviderOf | MiddlewareProviderOf[], order?: number): this {
        this.regMulti(this.midddlesToken, middlewares as ProvdierOf<MiddlewareLike>, order);
        this.reset();
        return this;
    }

    protected override getBackend(): Endpoint<TCtx, TOutput> {
        const middlewares = this.injector.get(this.midddlesToken);
        return new MiddlewareBackend(middlewares);
    }

}