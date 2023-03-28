import { Injector, ProvdierOf, Token } from '@tsdi/ioc';
import { Endpoint } from '../Endpoint';
import { EndpointContext } from '../endpoints';
import { FilterEndpoint } from '../filters/endpoint';
import { Filter } from '../filters/filter';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { MiddlewareLike, MiddlewareProviderOf } from './middleware';
import { MiddlewareBackend } from './middleware.compose';



export class MiddlewareEndpoint<TCtx extends EndpointContext, TOutput> extends FilterEndpoint<TCtx, TOutput> {

    constructor(
        injector: Injector,
        token: Token<Interceptor<TCtx, TOutput>[]>,
        private midddlesToken: Token<MiddlewareLike[]>,
        guardsToken?: Token<CanActivate[]>,
        filtersToken?: Token<Filter<TCtx, TOutput>[]>) {
        super(injector, token, null!, guardsToken, filtersToken);

    }

    useMiddlewares(middlewares: MiddlewareProviderOf | MiddlewareProviderOf[]): this {
        this.regMulti(this.midddlesToken, middlewares as ProvdierOf<MiddlewareLike>);
        this.reset();
        return this;
    }

    protected override getBackend(): Endpoint<TCtx, TOutput> {
        const middlewares = this.injector.get(this.midddlesToken);
        return new MiddlewareBackend(middlewares);
    }

}