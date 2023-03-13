import { EMPTY, Execption, Injector, isFunction, lang, pomiseOf, Token, TypeOf } from '@tsdi/ioc';
import { defer, mergeMap, Observable, throwError } from 'rxjs';
import { EndpointChain, Endpoint, EndpointBackend, InterceptorEndpoint } from '../Endpoint';
import { ForbiddenExecption } from '../execptions';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { EndpointContext } from './context';
import { Filter } from './filter';


/**
 * filter endpoint.
 */
export class FilterEndpoint<TInput = any, TOutput = any> extends EndpointChain<TInput, TOutput> {

    constructor(
        injector: Injector,
        token: Token<Interceptor<TInput, TOutput>[]>,
        backend: TypeOf<EndpointBackend<TInput, TOutput>>,
        private filteToken: Token<Interceptor<TInput, TOutput>[]>,
        guards?: TypeOf<CanActivate>[]) {
        super(injector, token, backend);
        if(guards) {
            this.useFilter(new GuardsFilter(guards.map(g=> isFunction(g)? injector.get(g): g)))
        }
    }

    useFilter(filter: TypeOf<Filter>, order?: number | undefined): this {
        this.multiOrder(this.filteToken, filter, order);
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
        return this.injector.get(this.filteToken, EMPTY);
    }

}

export class GuardsFilter<TInput = any, TOutput = any> implements Filter<TInput, TOutput> {
    constructor(private guards?: CanActivate[] | null, private throwExecption?: (() => Execption) | boolean) {

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
