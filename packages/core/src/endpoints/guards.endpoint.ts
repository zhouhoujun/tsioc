import { ArgumentExecption, EMPTY, Injector, InvocationContext, lang, OnDestroy, pomiseOf, ProvdierOf, StaticProvider, Token, TypeOf } from '@tsdi/ioc';
import { defer, mergeMap, Observable, throwError } from 'rxjs';
import { Interceptor } from '../Interceptor';
import { MicroServiceEndpoint } from './micro.endpoint';
import { ForbiddenExecption } from '../execptions';
import { CanActivate } from '../guard';
import { PipeTransform } from '../pipes';
import { Filter } from '../filters/filter';
import { RegisterChain } from './chain';
import { InterceptorHandler } from './handler';
import { Backend, Handler } from '../Handler';
import { Endpoint } from './endpoint';



/**
 * guards endpoint.
 */
export class GuardsEndpoint<TCtx extends InvocationContext = InvocationContext, TOutput = any> extends RegisterChain<TCtx, TOutput> implements Endpoint<TCtx, TOutput>, MicroServiceEndpoint<InvocationContext, TOutput>, OnDestroy {


    private guards: CanActivate[] | null | undefined;

    constructor(
        injector: Injector,
        token: Token<Interceptor<TCtx, TOutput>[]>,
        backend: TypeOf<Backend<TCtx, TOutput>>,
        protected guardsToken?: Token<CanActivate[]>,
        protected filtersToken?: Token<Filter<TCtx, TOutput>[]>) {
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
        if (this.guards === undefined) {
            this.guards = this.getGuards();
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

    
    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
    }

    protected clear() {
        this.guards = null;
        this.injector.unregister(this.token);
        if (this.guardsToken) this.injector.unregister(this.guardsToken);
        if (this.filtersToken) this.injector.unregister(this.filtersToken);
        this.injector = null!;
    }


    protected override compose(): Handler<TCtx, TOutput> {
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
    protected getFilters(): Filter<TCtx, TOutput>[] {
        return this.filtersToken ? this.injector.get(this.filtersToken, EMPTY) : EMPTY;
    }

}
