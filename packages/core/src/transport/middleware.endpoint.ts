import { Injector, ProvdierOf, Token, lang } from '@tsdi/ioc';
import { Backend } from '../Handler';
import { CanActivate, GUARDS_TOKEN } from '../guard';
import { Interceptor } from '../Interceptor';
import { FILTERS_TOKEN, Filter } from '../filters/filter';
import { AbstractGuardHandler } from '../handlers/guards';
import { TransportContext } from './context';
import { MIDDLEWARES_TOKEN, MiddlewareLike } from './middleware';
import { MiddlewareBackend } from './middleware.compose';
import { TransportEndpoint } from './transport.endpoint';


export class MiddlewareEndpoint<TCtx extends TransportContext, TOutput>
    extends AbstractGuardHandler<TCtx, TOutput> implements TransportEndpoint<TCtx, TOutput> {

    constructor(
        injector: Injector,
        token: Token<Interceptor<TCtx, TOutput>[]>,
        protected midddlesToken: Token<MiddlewareLike[]> = MIDDLEWARES_TOKEN,
        guardsToken: Token<CanActivate[]> = GUARDS_TOKEN,
        filtersToken: Token<Filter<TCtx, TOutput>[]> = FILTERS_TOKEN) {
        super(injector, token, guardsToken, filtersToken);

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