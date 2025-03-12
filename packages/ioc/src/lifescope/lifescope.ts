import { finalize, map } from 'rxjs';
import { composeInterceptors, Context, Handler, HandlerFn, InterceptorFn, InterceptorLike } from '../handler';
import { Platform } from '../platform';
import { isObservable, isPromise } from '../utils/chk';


export class LifeScope<TInput = any> implements Handler<TInput> {


    private _chain?: InterceptorFn | null;
    constructor(
        readonly platform: Platform | null,
        private backend: HandlerFn<TInput>,
        private interceptors: InterceptorLike<TInput>[] = []
    ) { }

    handle(input: any, context?: any, finalizeFn?: (input: TInput, context?: Context) => void) {
        if (!this._chain) {
            this._chain = this.compose();
        }
        const res$ = this._chain(input, this.backend, context ?? this.platform?.context);
        if (!finalizeFn) return res$;

        if (isObservable(res$)) {
            return res$.pipe(
                finalize(() => {
                    finalizeFn?.(input, context);
                })
            )
        } else if (isPromise(res$)) {
            return res$.then(res => {
                finalizeFn?.(input, context);
                return res;
            })
        } else {
            finalizeFn?.(input, context);
        }
    }

    /**
     * use interceptor for the handler.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    use(interceptors: InterceptorLike | InterceptorLike[], order?: number): this {
        const iterceps = Array.isArray(interceptors) ? interceptors : [interceptors]
        if (order) {
            this.interceptors.splice(order, 0, ...iterceps)
        } else {
            this.interceptors.push(...iterceps);
        }
        this.reset();
        return this;
    }

    protected reset(): void {
        this._chain = null;
    }

    /**
     * compose iterceptors and filters in chain.
     * @returns 
     */
    protected compose(): InterceptorFn {
        return composeInterceptors(this.interceptors)
    }

}