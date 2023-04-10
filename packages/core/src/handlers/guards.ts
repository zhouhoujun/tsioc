import { Abstract, ArgumentExecption, EMPTY, Injector, isFunction, lang, OnDestroy, pomiseOf, ProvdierOf, StaticProvider, Token, TypeOf } from '@tsdi/ioc';
import { defer, mergeMap, Observable, throwError } from 'rxjs';
import { Backend, Handler } from '../Handler';
import { CanActivate, GUARDS_TOKEN, GuardsService } from '../guard';
import { Interceptor, INTERCEPTORS_TOKEN, InterceptorService } from '../Interceptor';
import { ForbiddenExecption } from '../execptions';
import { PipeTransform, PipeService } from '../pipes/pipe';
import { Filter, FILTERS_TOKEN, FilterService } from '../filters/filter';
import { DynamicHandler } from './chain';
import { InterceptorHandler } from './handler';

/**
 * abstract guards handler.
 */
@Abstract()
export abstract class AbstractGuardHandler<TInput = any, TOutput = any> extends DynamicHandler<TInput, TOutput>
    implements Handler<TInput, TOutput>, GuardsService, PipeService, InterceptorService, FilterService, OnDestroy {


    private guards: CanActivate[] | null | undefined;

    constructor(
        injector: Injector,
        interceptorsToken: Token<Interceptor<TInput, TOutput>[]> = INTERCEPTORS_TOKEN,
        protected guardsToken: Token<CanActivate[]> = GUARDS_TOKEN,
        protected filtersToken: Token<Filter<TInput, TOutput>[]> = FILTERS_TOKEN) {
        super(injector, interceptorsToken);
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

    override handle(input: TInput): Observable<TOutput> {
        if (this.guards === undefined) {
            this.guards = this.getGuards();
        }

        if (!this.guards || !this.guards.length) return this.getChain().handle(input);
        const guards = this.guards;
        return defer(async () => {
            if (!(await lang.some(
                guards.map(gd => () => pomiseOf(gd.canActivate(input))),
                vaild => vaild === false))) {
                return false;
            }
            return true;
        }).pipe(
            mergeMap(r => {
                if (r === true) return this.getChain().handle(input);
                return throwError(() => new ForbiddenExecption())
            })
        )
    }


    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this.clear();
    }

    protected clear() {
        this.guards = null;
        this.injector.unregister(this.token);
        if (this.guardsToken) this.injector.unregister(this.guardsToken);
        if (this.filtersToken) this.injector.unregister(this.filtersToken);
        (this as any).injector  = null!;
    }


    protected override compose(): Handler<TInput, TOutput> {
        const chain = this.getInterceptors().reduceRight(
            (next, inteceptor) => new InterceptorHandler(next, inteceptor), this.getBackend());
        return this.getFilters().reduceRight(
            (next, inteceptor) => new InterceptorHandler(next, inteceptor), chain);
    }

    protected getGuards() {
        return this.guardsToken ? this.injector.get(this.guardsToken, null) : null;
    }

    /**
     *  get filters. 
     */
    protected getFilters(): Filter<TInput, TOutput>[] {
        return this.filtersToken ? this.injector.get(this.filtersToken, EMPTY) : EMPTY;
    }

}


/**
 * Guard handler
 */
export class GuardHandler<TInput = any, TOutput = any> extends AbstractGuardHandler<TInput, TOutput> {
    constructor(
        injector: Injector,
        protected backend: TypeOf<Backend<TInput, TOutput>>,
        interceptorsToken: Token<Interceptor<TInput, TOutput>[]> = INTERCEPTORS_TOKEN,
        guardsToken: Token<CanActivate[]> = GUARDS_TOKEN,
        filtersToken: Token<Filter<TInput, TOutput>[]> = FILTERS_TOKEN) {
        super(injector, interceptorsToken, guardsToken, filtersToken);

    }

    /**
     *  get backend endpoint. 
     */
    protected getBackend(): Backend<TInput, TOutput> {
        return isFunction(this.backend) ? this.injector.get(this.backend) : this.backend;
    }
}