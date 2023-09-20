import { Abstract, ArgumentExecption, createContext, EMPTY, Execption, getClassName, InjectFlags, Injector, InvocationContext, isInjector, isToken, isType, lang, OnDestroy, pomiseOf, ProvdierOf, StaticProvider, Token } from '@tsdi/ioc';
import { defer, mergeMap, Observable, throwError } from 'rxjs';
import { Backend, Handler } from '../Handler';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { Filter } from '../filters/filter';
import { DynamicHandler } from './chain';
import { InterceptorHandler } from './handler';
import { HandlerService } from './handler.service';



/**
 * abstract guards handler.
 */
@Abstract()
export abstract class AbstractGuardHandler<TInput = any, TOutput = any> extends DynamicHandler<TInput, TOutput>
    implements Handler<TInput, TOutput>, HandlerService, OnDestroy {


    private guards: CanActivate[] | null | undefined;

    constructor(
        readonly context: InvocationContext,
        interceptorsToken: Token<Interceptor<TInput, TOutput>[]>,
        protected guardsToken?: Token<CanActivate[]>,
        protected filtersToken?: Token<Filter<TInput, TOutput>[]>) {
        super(context.injector, interceptorsToken);
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
                return throwError(() => this.forbiddenError())
            })
        )
    }

    protected forbiddenError(): Execption {
        return new Execption('Forbidden')
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
        (this as any).injector = null!;
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
        context: Injector | InvocationContext,
        protected backend: Token<Backend<TInput, TOutput>> | Backend<TInput, TOutput>,
        interceptorsToken: Token<Interceptor<TInput, TOutput>[]>,
        guardsToken?: Token<CanActivate[]>,
        filtersToken?: Token<Filter<TInput, TOutput>[]>) {
        super(isInjector(context) ? createContext(context) : context, interceptorsToken, guardsToken, filtersToken);
        if (!backend) throw new ArgumentExecption(`Backend token missing of ${getClassName(this)}.`);
        if (isType(backend) && !this.injector.has(backend, InjectFlags.Self)) {
            this.injector.inject(backend);
        }
    }

    /**
     *  get backend endpoint. 
     */
    protected getBackend(): Backend<TInput, TOutput> {
        return isToken(this.backend) ? this.injector.get(this.backend, this.context) : this.backend;
    }
}

