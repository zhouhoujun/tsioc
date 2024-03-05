import { Abstract, ArgumentExecption, createContext, EMPTY, Execption, getClassName, InjectFlags, Injector, InvocationContext, isInjector, isToken, lang, OnDestroy, pomiseOf, ProvdierOf, StaticProvider, Token, isClassType, isArray, toProvider } from '@tsdi/ioc';
import { defer, mergeMap, Observable, Subject, takeUntil, throwError } from 'rxjs';
import { Backend, Handler } from '../Handler';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { Filter } from '../filters/filter';
import { InterceptingHandler, InterceptorHandler } from './handler';
import { HandlerService } from './handler.service';



/**
 * abstract guards intercepting handler.
 */
@Abstract()
export abstract class AbstractGuardHandler<TInput = any, TOutput = any> extends InterceptingHandler<TInput, TOutput>
    implements Handler<TInput, TOutput>, HandlerService, OnDestroy {


    private guards: CanActivate[] | null | undefined;
    private destroy$ = new Subject<void>();

    get injector() {
        return this.context.injector;
    }

    constructor(
        protected context: InvocationContext,
        protected interceptorsToken: Token<Interceptor<TInput, TOutput>[]>,
        protected guardsToken?: Token<CanActivate[]>,
        protected filtersToken?: Token<Filter<TInput, TOutput>[]>) {
        super(() => this.getBackend(), () => this.getInterceptors());
        if (!guardsToken) {
            this.guards = null;
        }
    }

    protected abstract getBackend(): Backend<TInput, TOutput>;


    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.injector.inject(pipes);
        return this;
    }

    useInterceptors(interceptor: ProvdierOf<Interceptor<TInput, TOutput>> | ProvdierOf<Interceptor<TInput, TOutput>>[], order?: number): this {
        this.regMulti(this.interceptorsToken, interceptor, order);
        this.reset();
        return this;
    }

    protected getInterceptors(): Interceptor<TInput, TOutput>[] {
        return this.injector.get(this.interceptorsToken, EMPTY);
    }

    protected regMulti<T>(token: Token, providers: ProvdierOf<T> | ProvdierOf<T>[], multiOrder?: number, isClass?: (type: Function) => boolean) {
        const multi = true;
        if (isArray(providers)) {
            this.injector.inject(providers.map((r, i) => toProvider(token, r, { multi, multiOrder, isClass })))
        } else {
            this.injector.inject(toProvider(token, providers, { multi, multiOrder, isClass }));
        }
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

        if (!this.guards || !this.guards.length) return super.handle(input);
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
                if (r === true) return super.handle(input);
                return throwError(() => this.forbiddenError())
            }),
            takeUntil(this.destroy$)
        )
    }

    protected forbiddenError(): Execption {
        return new Execption('Forbidden')
    }

    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this.destroy$.next();
        this.destroy$.complete();
        this.clear();
    }

    protected clear() {
        this.guards = null;
        this.injector.unregister(this.interceptorsToken);
        this.reset();
        if (this.guardsToken) this.injector.unregister(this.guardsToken);
        if (this.filtersToken) this.injector.unregister(this.filtersToken);
        this.context = null!;
    }


    protected override compose(): Handler<TInput, TOutput> {
        const chain = super.compose();
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
        context: Injector | InvocationContext,
        protected backendToken: Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>,
        interceptorsToken: Token<Interceptor<TInput, TOutput>[]>,
        guardsToken?: Token<CanActivate[]>,
        filtersToken?: Token<Filter<TInput, TOutput>[]>) {
        super(isInjector(context) ? createContext(context) : context, interceptorsToken, guardsToken, filtersToken);
        if (!backendToken) throw new ArgumentExecption(`Backend token missing of ${getClassName(this)}.`);
        if (isClassType(backendToken) && !this.injector.has(backendToken, InjectFlags.Self)) {
            this.injector.inject(backendToken);
        }
    }

    /**
     *  get backend endpoint. 
     */
    protected override getBackend(): Backend<TInput, TOutput> {
        return isToken(this.backendToken) ? this.injector.get(this.backendToken, this.context) : this.backendToken;
    }
}

