import { Parameter, tokenId, Invocation, AbstractType, PropertyMetadata, OperationArgumentResolver } from '@tsdi/ioc';
import { HandleContext } from './context';


/**
 * model parameter argument of an {@link Invocation}.
 */
 export interface ModelArgumentResolver extends OperationArgumentResolver<Parameter, HandleContext>  {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    canResolve(parameter: Parameter, ctx: HandleContext): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    resolve<T>(parameter: Parameter, ctx: HandleContext): T | null;

    /**
     * has the model type or not.
     * @param type model type.
     * @returns boolean.
     */
    hasModel(type: AbstractType | undefined): boolean;
    
    getPropertyMeta(type: AbstractType): PropertyMetadata[];
}

/**
 * model argument resolvers multi token.
 * provider instances of {@link ModelArgumentResolver}
 */
export const MODEL_RESOLVERS = tokenId<ModelArgumentResolver[]>('MODEL_RESOLVERS');

