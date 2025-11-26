import { Abstract, AbstractType, Invocation, ProvidedInMetadata, InvocationOptions, InvocationFactory, InvocationContext, HandleResult } from '@tsdi/ioc';
import { ConfigableHandlerOptions, HandlerOptions } from './handlers/configable';
import { Handler, RunableContext } from './handler';


/**
 * Invocation handler
 */
@Abstract()
export abstract class InvocationHandler<
    TInput = any,
    TOutput = any,
    TOptions extends InvocationHandlerOptions = InvocationHandlerOptions,
    TContext extends RunableContext = RunableContext,
    T = any> implements Handler<TInput, TOutput, TContext> {

    /**
     * invocation.
     */
    abstract get invocation(): Invocation<T>;

    abstract get context(): InvocationContext;

    /**
     * get config options.
     */
    abstract getOptions(): TOptions;


    /**
     * append handler options.
     * @param options 
     */
    abstract append(options: HandlerOptions<TInput>): this;


    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     */
    abstract handle(input: TInput, context?: TContext): HandleResult<TOutput>;

    /**
     * destroy hooks.
     */
    abstract onDestroy(): void;
}


/**
 * Invocation Handler factory.
 */
@Abstract()
export abstract class InvocationHanlderFactory extends InvocationFactory {


}



/**
 * Respond 
 */
@Abstract()
export abstract class Respond<TInput = any> {
    /**
     * respond with handled data.
     * @param input endpoint input data.
     * @param value handled returnning value
     */
    abstract respond<T>(input: TInput, value: T, context: RunableContext): void;
}

/**
 * Respond adapter with response type.
 */
@Abstract()
export abstract class TypedRespond<TInput = any> {
    /**
     * respond with handled data.
     * @param input input data.
     * @param value handled returnning value
     * @param responseType response type
     */
    abstract respond<T>(input: TInput, value: T, responseType: 'body' | 'header' | 'response', context: RunableContext): void;
}



/**
 * Invocation handler options.
 * 
 * 终结点配置
 */
export interface InvocationHandlerOptions<T = any> extends Omit<ConfigableHandlerOptions<T>, 'backend'>, Omit<InvocationOptions, 'propertyKey'>, ProvidedInMetadata {
    /**
     * the endpoint run times limit. 
     */
    limit?: number;
    /**
     * auto bootstrap endpoint attached. default true.
     */
    bootstrap?: boolean;
    /**
     * endpoint order
     */
    order?: number;
    /**
     * endpoint handler response as.
     */
    response?: 'body' | 'header' | 'response' | AbstractType<Respond<T>> | ((input: T, returnning: any, context: RunableContext) => void);

}
