import {
    Abstract, ArgumentExecption, createContext, EMPTY, Execption, Injector, InvocationContext,
    isInjector, isToken, lang, OnDestroy, pomiseOf, ProvdierOf, StaticProvider, Token, isArray, toProvider
} from '@tsdi/ioc';
import { defer, mergeMap, Observable, Subject, takeUntil, throwError } from 'rxjs';
import { Backend, Handler } from '../Handler';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { Filter } from '../filters/filter';
import { InterceptingHandler, InterceptorHandler } from './handler';
import { HandlerService } from './configable';

export interface BackendOptions<TInput = any> {
    backend?: Token<Backend<TInput>> | Backend<TInput>
}

export interface GuardHandlerOptions<TInput = any> extends BackendOptions<TInput> {
    /**
     * interceptors token.
     */
    interceptorsToken?: Token<Interceptor<TInput>[]>;
    /**
     * guards tokens.
     */
    guardsToken?: Token<CanActivate<TInput>[]>;
    /**
     * filter tokens.
     */
    filtersToken?: Token<Filter<TInput>[]>;
}

/**
 * guards intercepting handler.
 */
@Abstract()
export class GuardHandler<TInput = any, TOutput = any, TOptions extends GuardHandlerOptions = GuardHandlerOptions<TInput>, TContext = any> extends InterceptingHandler<TInput, TOutput, TContext>
    implements Handler<TInput, TOutput>, HandlerService, OnDestroy {


    private guards: CanActivate[] | null | undefined;
    private destroy$ = new Subject<void>();

    get injector() {
        return this.context.injector;
    }

    protected options: TOptions;

    constructor(
        protected context: InvocationContext,
        options: TOptions) {
        super(() => this.getBackend(), () => this.getInterceptors());
        this.options = this.initOptions(options);
        if (!this.options.guardsToken) {
            this.guards = null;
        }
    }

    protected initOptions(options: TOptions) {
        return options;
    }

    /**
     * use pipes
     * @param pipes 
     * @returns 
     */
    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.injector.inject(pipes);
        return this;
    }

    /**
     * use interceptor for the handler.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    useInterceptors(interceptor: ProvdierOf<Interceptor<TInput, TOutput>> | ProvdierOf<Interceptor<TInput, TOutput>>[], order?: number): this {
        if (!this.options.interceptorsToken) return this;
        this.regMulti(this.options.interceptorsToken, interceptor, order);
        this.reset();
        return this;
    }


    /**
     * use guards for the handler.
     * @param guards 
     */
    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this {
        if (!this.options.guardsToken) throw new ArgumentExecption('no guards token');
        this.regMulti(this.options.guardsToken, guards, order);
        this.guards = undefined;
        return this;
    }

    /**
     * use filters for the handler.
     * @param filter 
     * @param order 
     * @returns 
     */
    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this {
        if (!this.options.filtersToken) throw new ArgumentExecption('no filters token');
        this.regMulti(this.options.filtersToken, filter, order);
        this.reset();
        return this;
    }

    override handle(input: TInput, context?: TContext): Observable<TOutput> {
        if (this.guards === undefined) {
            this.guards = this.getGuards();
        }

        if (!this.guards || !this.guards.length) return super.handle(input, context);
        const guards = this.guards;
        return defer(async () => {
            if (!(await lang.some(
                guards.map(gd => () => pomiseOf(gd.canActivate(input, context))),
                vaild => vaild === false))) {
                return false;
            }
            return true;
        }).pipe(
            mergeMap(r => {
                if (r === true) return super.handle(input, context);
                return throwError(() => this.forbiddenError())
            }),
            takeUntil(this.destroy$)
        )
    }

    private _destroyed = false;
    onDestroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this.destroy$.next();
        this.destroy$.complete();
        this.clear();
    }

    protected forbiddenError(): Execption {
        return new Execption('Forbidden')
    }

    protected clear() {
        this.guards = null;
        if (this.options.interceptorsToken) this.injector.unregister(this.options.interceptorsToken);
        this.reset();
        if (this.options.guardsToken) this.injector.unregister(this.options.guardsToken);
        if (this.options.filtersToken) this.injector.unregister(this.options.filtersToken);
        this.context = null!;
        this.options = null!;
    }

    /**
     * compose iterceptors and filters in chain.
     * @returns 
     */
    protected override compose(): Handler<TInput, TOutput> {
        const chain = super.compose();
        return this.getFilters().reduceRight(
            (next, inteceptor) => new InterceptorHandler(next, inteceptor), chain);
    }

    /**
     * get registered iterceptors of the handler.
     * @returns 
     */
    protected getInterceptors(): Interceptor<TInput, TOutput>[] {
        if (!this.options.interceptorsToken) return EMPTY;
        return this.injector.get(this.options.interceptorsToken, EMPTY);
    }

    /**
     * get registered backend of the handler.
     * @returns 
     */
    protected getBackend(): Backend<TInput, TOutput> {
        if (!this.options.backend) throw new ArgumentExecption('backend is empty.');
        return isToken(this.options.backend) ? this.injector.get(this.options.backend, this.context) : this.options.backend;
    }

    /**
     * get registered guards of the handler.
     * @returns 
     */
    protected getGuards() {
        return this.options.guardsToken ? this.injector.get(this.options.guardsToken, null) : null;
    }

    /**
     *  get registered filters of the handler. 
     */
    protected getFilters(): Filter<TInput, TOutput>[] {
        return this.options.filtersToken ? this.injector.get(this.options.filtersToken, EMPTY) : EMPTY;
    }

    protected regMulti<T>(token: Token, providers: ProvdierOf<T> | ProvdierOf<T>[], multiOrder?: number, isClass?: (type: Function) => boolean) {
        const multi = true;
        if (isArray(providers)) {
            this.injector.inject(providers.map((r, i) => toProvider(token, r, { multi, multiOrder, isClass })))
        } else {
            this.injector.inject(toProvider(token, providers, { multi, multiOrder, isClass }));
        }
    }

}

export function createGuardHandler<TInput, TOutput>(
    context: InvocationContext | Injector,
    backend: Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>,
    interceptorsToken: Token<Interceptor<TInput, TOutput>[]>,
    guardsToken?: Token<CanActivate[]>,
    filtersToken?: Token<Filter<TInput, TOutput>[]>) {

    return new GuardHandler(isInjector(context) ? createContext(context) : context, {
        backend,
        interceptorsToken,
        guardsToken,
        filtersToken
    });

}

