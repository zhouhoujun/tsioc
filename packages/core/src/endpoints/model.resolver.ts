import { Parameter, tokenId, OperationInvoker, Type, PropertyMetadata } from '@tsdi/ioc';
import { EndpointContext } from './context';


/**
 * model parameter argument of an {@link OperationInvoker}.
 */
 export interface ModelArgumentResolver<TInput = any> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    canResolve(parameter: Parameter, ctx: EndpointContext<TInput>): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    resolve<T>(parameter: Parameter<T>, ctx: EndpointContext<TInput>): T;

    /**
     * has the model type or not.
     * @param type model type.
     * @returns boolean.
     */
    hasModel(type: Type | undefined): boolean;
    
    getPropertyMeta(type: Type): PropertyMetadata[];
}

/**
 * model argument resolvers multi token.
 * provider instances of {@link ModelArgumentResolver}
 */
export const MODEL_RESOLVERS = tokenId<ModelArgumentResolver[]>('MODEL_RESOLVERS');

