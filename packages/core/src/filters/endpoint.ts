import { ArgumentExecption, EMPTY, Injector, InvocationContext, lang, pomiseOf, ProvdierOf, StaticProvider, Token, TypeOf } from '@tsdi/ioc';
import { defer, mergeMap, Observable, throwError } from 'rxjs';
import { EndpointChain, Endpoint, EndpointBackend, InterceptorEndpoint } from '../Endpoint';
import { EndpointService } from '../EndpointService';
import { ForbiddenExecption } from '../execptions';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes';
import { Filter } from './filter';



/**
 * filter endpoint.
 */
export class FilterEndpoint<TInput = any, TOutput = any> extends EndpointChain<TInput, TOutput> implements EndpointService {


    private guards: CanActivate[] | null | undefined;

    constructor(
        injector: Injector,
        token: Token<Interceptor<TInput, TOutput>[]>,
        backend: TypeOf<EndpointBackend<TInput, TOutput>>,
        private guardsToken?: Token<CanActivate[]>,
        private filtersToken?: Token<Interceptor<TInput, TOutput>[]>) {
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

    useFilter(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this {
        if (!this.filtersToken) throw new ArgumentExecption('no filters token');
        this.regMulti(this.filtersToken, filter, order);
        this.reset();
        return this;
    }

    override handle(input: TInput, context: InvocationContext): Observable<TOutput> {
        if (this.guards === undefined && this.guardsToken) {
            this.guards = this.injector.get(this.guardsToken, null);
        }

        if (!this.guards || !this.guards.length) return this.getChain().handle(input, context);
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
                if (r === true) return this.getChain().handle(input, context);
                return throwError(() => new ForbiddenExecption())
            })
        )
    }

    protected override compose(): Endpoint<TInput, TOutput> {
        const chain = this.getInterceptors().reduceRight(
            (next, inteceptor) => new InterceptorEndpoint(next, inteceptor), this.getBackend());
        return this.filtersToken ? this.getFilters(this.filtersToken).reduceRight(
            (next, inteceptor) => new InterceptorEndpoint(next, inteceptor), chain) : chain;
    }

    /**
     *  get filters. 
     */
    protected getFilters(token: Token<Filter[]>): Filter<TInput, TOutput>[] {
        return this.injector.get(token, EMPTY);
    }

}
