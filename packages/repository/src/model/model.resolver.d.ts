import { AbstractType, Type, Parameter, Interceptor, Handler, Runtime, RunContext, ContextToken } from '@tsdi/ioc';
import { ModelArgumentResolver } from '@tsdi/core';
import { DBPropertyMetadata, FieldResolveInterceptor, ModelFieldResolver } from './field.resolver';
export declare const MSG: ContextToken<any>;
/**
 * abstract model argument resolver. base implements {@link ModelArgumentResolver}.
 */
export declare abstract class AbstractModelArgumentResolver<TOutput = any> implements Interceptor<Parameter, TOutput, RunContext> {
    abstract get runtime(): Runtime;
    abstract get fieldResolves(): FieldResolveInterceptor[] | null;
    private canResolve;
    intercept(parameter: Parameter, next: Handler<Parameter, TOutput, RunContext>, ctx: RunContext): TOutput;
    resolveModel(modelType: Type, ctx: RunContext, fields: Record<string, any>, nullable?: boolean): any;
    protected createInstance(model: Type): any;
    private _resolver;
    protected get fieldResolver(): ModelFieldResolver;
    /**
     * the type is model or not.
     * @param type class type.
     * @returns boolean.
     */
    abstract hasModel(type: AbstractType | undefined): boolean;
    /**
     * get db property metadatas.
     */
    abstract getPropertyMeta(type: AbstractType): DBPropertyMetadata[];
    /**
     * has model fields in context or not.
     */
    protected abstract hasFields<T>(parameter: Parameter<T>, ctx: RunContext): boolean;
    /**
     * get model fields in context.
     */
    protected abstract getFields<T>(parameter: Parameter<T>, ctx: RunContext): Record<string, any>;
}
/**
 * model resolve option.
 */
export interface ModelResolveOption {
    /**
     * the type is model or not.
     * @param type class type.
     * @returns boolean.
     */
    isModel(type: AbstractType): boolean;
    /**
     * create model instance.
     */
    createInstance?<T>(model: AbstractType<T>): T;
    /**
     * get db property metadatas.
     */
    getPropertyMeta: (type: AbstractType) => DBPropertyMetadata[];
    /**
     * has model fields in context or not.
     */
    hasField?: (parameter: Parameter<any>, ctx: RunContext) => boolean;
    /**
     * get model fields in context.
     */
    getFields: (parameter: Parameter<any>, ctx: RunContext) => Record<string, any>;
    /**
     * custom field resolvers.
     */
    fieldResolvers?: FieldResolveInterceptor[];
}
/**
 * model resolver factory. create resolver for {@link Invocation}.
 * @param runtime runtime.
 * @returns model resolver instance of {@link ModelArgumentResolver}.
 */
export declare function createModelResolver<TOutput>(runtime: Runtime, option: ModelResolveOption): ModelArgumentResolver<TOutput>;
