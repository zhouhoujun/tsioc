import { Parameter, tokenId, Invocation, AbstractType, PropertyMetadata, Interceptor, Handler } from '@tsdi/ioc';
import { HandleContext } from './context';


/**
 * model parameter argument of an {@link Invocation}.
 */
export interface ModelArgumentResolver<TOutput = any> extends Interceptor<Parameter, TOutput, HandleContext> {
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    intercept(parameter: Parameter, next: Handler<Parameter, TOutput, HandleContext>, ctx: HandleContext): TOutput;

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

