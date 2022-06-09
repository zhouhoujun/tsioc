import { Parameter, tokenId, OperationInvoker } from '@tsdi/ioc';
import { TransportContext } from './context';


/**
 * model parameter argument of an {@link OperationInvoker}.
 */
 export interface ModelArgumentResolver<C = any> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    canResolve(parameter: Parameter, ctx: TransportContext): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    resolve<T>(parameter: Parameter<T>, ctx: TransportContext): T;
}

/**
 * model argument resolvers mutil token.
 * provider instances of {@link ModelArgumentResolver}
 */
export const MODEL_RESOLVERS = tokenId<ModelArgumentResolver[]>('MODEL_RESOLVERS');
