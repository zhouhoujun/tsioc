import { Injector, ProvdierOf, Token } from '@tsdi/ioc';
import { Backend } from '../Handler';
import { EndpointContext } from '../endpoints';
import { GuardsEndpoint } from '../endpoints/guards.endpoint';
import { Filter } from '../filters/filter';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { MiddlewareLike, MiddlewareOf } from './middleware';
import { MiddlewareBackend } from './middleware.compose';
import { ServerEndpoint } from './server.endpoint';


export class MiddlewareEndpoint<TCtx extends EndpointContext, TOutput>
    extends GuardsEndpoint<TCtx, TOutput> implements ServerEndpoint<TCtx, TOutput> {

    constructor(
        injector: Injector,
        token: Token<Interceptor<TCtx, TOutput>[]>,
        protected midddlesToken: Token<MiddlewareLike[]>,
        guardsToken?: Token<CanActivate[]>,
        filtersToken?: Token<Filter<TCtx, TOutput>[]>) {
        super(injector, token, null!, guardsToken, filtersToken);

    }

    use(middlewares: MiddlewareOf | MiddlewareOf[], order?: number): this {
        this.regMulti(this.midddlesToken, middlewares as ProvdierOf<MiddlewareLike>, order);
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