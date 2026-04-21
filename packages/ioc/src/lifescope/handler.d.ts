import { Handler, HandlerFn, TailNext } from '../handlers/handler';
import { InterceptorFn, InterceptorLike } from '../handlers/interceptor';
/**
 * runtime handler.
 */
export declare class RuntimeHandler<TInput = any, TOutput = any, TContext = any> implements Handler<TInput, TOutput, TContext> {
    private chain?;
    private backend;
    protected interceptors: InterceptorLike[];
    constructor(backend: HandlerFn<TInput, TOutput, TContext> | Handler<TInput, TOutput, TContext>, interceptors?: InterceptorLike<TInput, TOutput, TContext>[]);
    /**
     * use interceptor for the handler.
     * @param interceptor
     * @param order
     * @returns
     */
    use(interceptors: InterceptorLike | InterceptorLike[], order?: number): this;
    getIndexOf(interceptor: InterceptorLike): number;
    handle(input: TInput, context: TContext, tail?: TailNext<TOutput, TContext>): TOutput;
    protected reset(): void;
    protected compose(): InterceptorFn<TInput, TOutput, TContext>;
}
