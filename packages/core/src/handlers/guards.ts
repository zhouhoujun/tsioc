import { Abstract, Execption, lang, OnDestroy, promiseOf, isFunction } from '@tsdi/ioc';
import { defer, mergeMap, Observable, Subject, takeUntil, throwError } from 'rxjs';
import { Backend, Handler } from '../Handler';
import { GuardLike } from '../guard';
import { InterceptorLike } from '../Interceptor';
import { FilterLike } from '../filters/filter';
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

    private _guards?: GuardLike[] | null;
    private _guardsFac?: () => GuardLike[] | null;


    constructor(
        backend: Backend<TInput, TOutput, TContext> | (() => Backend<TInput, TOutput, TContext>),
        interceptors: InterceptorLike[] | (() => InterceptorLike[]) = [],
        guards?: GuardLike[] | null | (() => GuardLike[] | null),
        private filters?: FilterLike[] | (() => FilterLike[]),
    ) {
        super(backend, interceptors);
        if (isFunction(guards)) {
            this._guardsFac = guards;
        } else {
            this._guards = guards;
        }
    }

    override handle(input: TInput, context?: TContext): Observable<TOutput> {
        return defer(async () => {

            if (this.onReady) await this.onReady();

            if (this._guards === undefined && this._guardsFac) {
                this._guards = this._guardsFac() ?? null;
            }
            if (!this._guards || !this._guards.length) return true;

            if (!(await lang.some(
                this._guards!.map(gd => () => promiseOf(isFunction(gd)? gd(input, context) : gd.canHandle(input, context))),
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

    /**
     * on ready hook.
     */
    protected onReady?(): Promise<void>;

    protected override reset(): void {
        super.reset();
        this._guards = undefined;
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

