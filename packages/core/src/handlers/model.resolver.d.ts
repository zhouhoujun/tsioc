import { Parameter, AbstractType, PropertyMetadata, ResolveInterceptor } from '@tsdi/ioc';
/**
 * model parameter argument of an {@link Invocation}.
 */
export interface ModelArgumentResolver<TOutput = any> extends ResolveInterceptor<Parameter, TOutput> {
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
export declare const MODEL_RESOLVERS: import("@tsdi/ioc").InjectToken<ModelArgumentResolver<any>[]>;
