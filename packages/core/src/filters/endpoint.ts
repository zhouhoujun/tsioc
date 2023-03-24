import { EMPTY, Execption, getClass, Injector, isArray, isFunction, isType, lang, pomiseOf, ProvdierOf, StaticProvider, Token, TypeOf } from '@tsdi/ioc';
import { defer, mergeMap, Observable, throwError } from 'rxjs';
import { EndpointChain, Endpoint, EndpointBackend, InterceptorEndpoint } from '../Endpoint';
import { EndpointService } from '../EndpointService';
import { ForbiddenExecption } from '../execptions';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes';
import { EndpointContext } from './context';
import { Filter } from './filter';



/**
 * filter endpoint.
 */
export class FilterEndpoint<TInput = any, TOutput = any> extends EndpointChain<TInput, TOutput> implements EndpointService {


    constructor(
        injector: Injector,
        token: Token<Interceptor<TInput, TOutput>[]>,
        backend: TypeOf<EndpointBackend<TInput, TOutput>>,
        private filterToken: Token<Interceptor<TInput, TOutput>[]>,
        private guardsToken: Token<CanActivate[]>) {
        super(injector, token, backend);
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
        this.regMulti(this.guardsToken, guards, order);
        this.reset();
        return this;
    }

    useFilter(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this {
        this.regMulti(this.filterToken, filter, order);
        this.reset();
        return this;
    }

    protected override compose(): Endpoint<TInput, TOutput> {
        const chain = this.getInterceptors().reduceRight(
            (next, inteceptor) => new InterceptorEndpoint(next, inteceptor), this.getBackend());
        return this.getFilters().reduceRight(
            (next, inteceptor) => new InterceptorEndpoint(next, inteceptor), chain);
    }

    /**
     *  get filters. 
     */
    protected getFilters(): Filter<TInput, TOutput>[] {
        let filters = this.injector.get(this.filterToken, EMPTY);
        const guards = this.injector.get(this.guardsToken, EMPTY);
        if (guards && guards.length) {
            filters = [new GuardsFilter(guards), ...filters];
        }
        return filters;
    }

}

export class GuardsFilter<TInput = any, TOutput = any> implements Filter<TInput, TOutput> {
    constructor(private guards?: CanActivate[] | null, private throwExecption?: (() => Execption) | boolean) {

    }

    useGuards(guards: CanActivate[]) {
        if (!this.guards) {
            this.guards = [];
        }
        this.guards.push(...guards);
    }

    reset(guards?: CanActivate[]) {
        this.guards = guards ?? [];
    }

    intercept(input: TInput, next: Endpoint<TInput, TOutput>, context: EndpointContext): Observable<TOutput> {
        if (!this.guards || !this.guards.length) return next.handle(input, context);
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
                if (r === true) return next.handle(input, context);
                if (this.throwExecption) {
                    return throwError(isFunction(this.throwExecption) ? this.throwExecption : () => new ForbiddenExecption())
                }
                return null!;
            })
        )
    }
}
