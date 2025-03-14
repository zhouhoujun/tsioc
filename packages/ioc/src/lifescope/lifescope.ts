import { BaseChain, Handler, HandlerFn, InterceptorLike, invokeTail, NextOpter } from '../handler';
import { Platform } from '../platform';

export class LifeScope<TInput = any> extends BaseChain<TInput> implements Handler<TInput> {

    constructor(
        readonly platform: Platform | null,
        private backend: HandlerFn<TInput>,
        interceptors: InterceptorLike<TInput>[] = []
    ) {
        super(interceptors)
    }

    handle(input: any, context?: any, next?: NextOpter<any>|((input: TInput) => any)) {
        const chain = this.getChain();
        return invokeTail(()=> chain(input, this.backend, context ?? this.platform?.context), next, context);
    }
}