import { Abstract, AbstractType, Invocation, ProvidedInMetadata, InvocationOptions, InvocationFactory } from '@tsdi/ioc';
import { AbstractConfigableHandler, ConfigableHandlerOptions } from './handlers/configable';
import { Handler, RunContext } from './handler';


/**
 * Invocation handler
 */
@Abstract()
export abstract class InvocationHandler<
    TInput = any,
    TOutput = any,
    TContext extends RunContext = RunContext,
    T = any> extends AbstractConfigableHandler<TInput, TOutput, TContext> implements Handler<TInput, TOutput, TContext> {

    /**
     * invocation.
     */
    abstract get invocation(): Invocation<T>;

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
    abstract respond<T>(input: TInput, value: T, context: RunContext): void;
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
    abstract respond<T>(input: TInput, value: T, responseType: 'body' | 'header' | 'response', context: RunContext): void;
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
    response?: 'body' | 'header' | 'response' | AbstractType<Respond<T>> | ((input: T, returnning: any, context: RunContext) => void);

}
