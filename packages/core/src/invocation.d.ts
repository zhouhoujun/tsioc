import { Invocation, ProvidedInMetadata, InvocationOptions, InvocationFactory, Exception, Handler, RunContext } from '@tsdi/ioc';
import { AbstractConfigableHandler, ConfigableHandlerOptions } from './handlers/configable';
/**
 * Invocation handler
 */
export declare abstract class InvocationHandler<TInput = any, TOutput = any, TContext extends RunContext = RunContext, T = any> extends AbstractConfigableHandler<TInput, TOutput, TContext> implements Handler<TInput, TOutput, TContext> {
    /**
     * invocation.
     */
    abstract get invocation(): Invocation<T>;
}
/**
 * Invocation Handler factory.
 */
export declare abstract class InvocationHanlderFactory extends InvocationFactory {
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
    response?: 'body' | 'header' | 'response' | Respond<T> | ((input: T, returnning: any, context: RunContext) => any);
}
/**
 * Respond
 */
export declare abstract class Respond<TInput = any, TOutput = any> {
    /**
     * respond with handled data.
     * @param input endpoint input data.
     * @param value handled returnning value
     */
    abstract respond<T>(input: TInput, value: T, context: RunContext): TOutput;
}
/**
 * Respond
 */
export declare abstract class ExceptionRespond<TInput = any, TOutput = any> {
    /**
     * respond with handled data.
     * @param input endpoint input data.
     * @param value handled returnning value
     */
    abstract respond<T>(input: TInput, exception: Exception, context: RunContext): TOutput;
}
/**
 * Respond adapter with response type.
 */
export declare abstract class TypedRespond<TInput = any, TOutput = any> {
    /**
     * respond with handled data.
     * @param input input data.
     * @param value handled returnning value
     * @param responseType response type
     */
    abstract respond<T>(input: TInput, value: T, responseType: 'body' | 'header' | 'response', context: RunContext): TOutput;
}
