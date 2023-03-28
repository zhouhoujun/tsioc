import { ArgumentExecption, EMPTY, Injector, InvocationContext, lang, pomiseOf, ProvdierOf, StaticProvider, Token, TypeOf } from '@tsdi/ioc';
import { defer, mergeMap, Observable, throwError } from 'rxjs';
import { Interceptor } from '../Interceptor';
import { Endpoint, EndpointBackend } from '../Endpoint';
import { EndpointChain } from '../endpoints/chain';
import { InterceptorHandler } from '../endpoints/handler';
import { ServiceEndpoint } from '../EndpointService';
import { ForbiddenExecption } from '../execptions';
import { CanActivate } from '../guard';
import { PipeTransform } from '../pipes';
import { Filter } from '../filters/filter';



/**
 * Guards endpoint.
 */
export class GuardsEndpoint<TCtx extends InvocationContext = InvocationContext, TOutput = any> extends EndpointChain<TCtx, TOutput> implements ServiceEndpoint<InvocationContext, TOutput> {


    private guards: CanActivate[] | null | undefined;

    constructor(
        injector: Injector,
        token: Token<Interceptor<TCtx, TOutput>[]>,
        backend: TypeOf<EndpointBackend<TCtx, TOutput>>,
        private guardsToken?: Token<CanActivate[]>,
        private filtersToken?: Token<Filter<TCtx, TOutput>[]>) {
        super(injector, token, backend);
        if (!guardsToken) {
            this.guards = null;
        }
    }


    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.injector.inject(pipes);
        return this;
    }

    /**
     * use guards.
     * @param guards 
     */
    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this {
        if (!this.guardsToken) throw new ArgumentExecption('no guards token');
        this.regMulti(this.guardsToken, guards, order);
        this.guards = undefined;
        return this;
    }

    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this {
        if (!this.filtersToken) throw new ArgumentExecption('no filters token');
        this.regMulti(this.filtersToken, filter, order);
        this.reset();
        return this;
    }

    override handle(context: TCtx): Observable<TOutput> {
        if (this.guards === undefined && this.guardsToken) {
            this.guards = this.injector.get(this.guardsToken, null);
        }

        if (!this.guards || !this.guards.length) return this.getChain().handle(context);
        const guards = this.guards;
        return defer(async () => {
            if (!(await lang.some(
                guards.map(gd => () => pomiseOf(gd.canActivate(context))),
                vaild => vaild === false))) {
                return false;
            }
            return true;
        }).pipe(
            mergeMap(r => {
                if (r === true) return this.getChain().handle(context);
                return throwError(() => new ForbiddenExecption())
            })
        )
    }

    protected override compose(): Endpoint<TCtx, TOutput> {
        const chain = this.getInterceptors().reduceRight(
            (next, inteceptor) => new InterceptorHandler(next, inteceptor), this.getBackend());
        return this.filtersToken ? this.getFilters(this.filtersToken).reduceRight(
            (next, inteceptor) => new InterceptorHandler(next, inteceptor), chain) : chain;
    }

    /**
     *  get filters. 
     */
    protected getFilters(token: Token<Filter[]>): Filter<TCtx, TOutput>[] {
        return this.injector.get(token, EMPTY);
    }

}
