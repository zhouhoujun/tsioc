import { composeInterceptors, Handler, HandlerFn, InterceptorFn, InterceptorLike, invokeTail, NextOpter } from '../handler';
import { Platform } from '../platform';
import { Empty } from '../types';
import { isNumber } from '../utils/chk';

/**
 * Life scope.
 */
export class LifeScope<TInput = any> implements Handler<TInput> {

    private _chain?: InterceptorFn<TInput> | null;
    private interceptors: InterceptorLike<TInput>[]

    constructor(
        readonly platform: Platform | null,
        private backend: HandlerFn<TInput>,
        interceptors: InterceptorLike<TInput>[] = Empty
    ) {
        this.interceptors = interceptors.slice();
    }

    handle(input: any, context?: any, next?: NextOpter<any> | ((input: TInput) => any)) {
        const chain = this.getChain();
        return invokeTail(() => chain(input, this.backend, context ?? this.platform?.context), next);
    }

    /**
     * use interceptor for the handler.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    use(interceptors: InterceptorLike | InterceptorLike[], order?: number): this {
        const iterceps = Array.isArray(interceptors) ? interceptors : [interceptors]
        if (isNumber(order)) {
            this.interceptors.splice(order, 0, ...iterceps)
        } else {
            this.interceptors.push(...iterceps);
        }
        this.reset();
        return this;
    }

    getIndexOf(interceptor: InterceptorLike) {
        return this.interceptors.indexOf(interceptor)
    }

    protected getChain(): InterceptorFn<TInput> {
        if (!this._chain) {
            this._chain = this.compose();
        }
        return this._chain;
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