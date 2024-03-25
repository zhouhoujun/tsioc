import { Abstract, Execption, lang, OnDestroy, pomiseOf, Token, isFunction } from '@tsdi/ioc';
import { defer, mergeMap, Observable, Subject, takeUntil, throwError } from 'rxjs';
import { Backend, Handler } from '../Handler';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { Filter } from '../filters/filter';
import { InterceptingHandler, InterceptorHandler } from './handler';

/**
 * guards intercepting handler.
 */
@Abstract()
export class GuardHandler<
    TInput = any,
    TOutput = any,
    TContext = any> extends InterceptingHandler<TInput, TOutput, TContext>
    implements Handler<TInput, TOutput>, OnDestroy {

    private destroy$ = new Subject<void>();


    constructor(
        backend: Backend<TInput, TOutput, TContext> | (() => Backend<TInput, TOutput, TContext>),
        interceptors: Interceptor[] | (() => Interceptor[]) = [],
        private guards?: CanActivate[] | (() => CanActivate[]),
        private filters?: Filter[] | (() => Filter[]),
    ) {
        super(backend, interceptors);
    }

    override handle(input: TInput, context?: TContext): Observable<TOutput> {

        if (!this.guards) return super.handle(input, context);
        const guards = isFunction(this.guards) ? this.guards() : this.guards;
        if (!guards || !this.guards.length) return super.handle(input, context);
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
        this.guards = null!;
        this.filters = null!;
        this.reset();
    }

    /**
     * compose iterceptors and filters in chain.
     * @returns 
     */
    protected override compose(): Handler<TInput, TOutput> {
        const chain = super.compose();
        return this.filters ? (isFunction(this.filters) ? this.filters() : this.filters).reduceRight(
            (next, inteceptor) => new InterceptorHandler(next, inteceptor), chain) : chain;
    }

}

