import { Parameter, tokenId, Invocation, Type, PropertyMetadata, OperationArgumentResolver } from '@tsdi/ioc';
import { HandleContext } from './context';


/**
 * model parameter argument of an {@link Invocation}.
 */
 export interface ModelArgumentResolver<TParameter extends Parameter = Parameter, TCtx extends HandleContext = HandleContext> extends OperationArgumentResolver<TParameter, TCtx>  {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    canResolve<T>(parameter: TParameter, ctx: TCtx): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    resolve<T>(parameter: TParameter, ctx: TCtx): T | null;

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

