import { finalize, map } from 'rxjs';
import { BaseChain, Context, Handler, HandlerFn, Interceptor, InterceptorLike } from '../handler';
import { Platform } from '../platform';
import { isNumber, isObservable, isPromise } from '../utils/chk';

export class LifeScope<TInput = any> extends BaseChain<TInput> implements Handler<TInput> {

    constructor(
        readonly platform: Platform | null,
        private backend: HandlerFn<TInput>,
        interceptors: InterceptorLike<TInput>[] = []
    ) {
        super(interceptors)
    }

    handle(input: any, context?: any, finalizeFn?: (input: TInput, context?: Context) => void) {
        const chain = this.getChain();
        const res$ = chain(input, this.backend, context ?? this.platform?.context);
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
}