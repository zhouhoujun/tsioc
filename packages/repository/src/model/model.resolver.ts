import { Abstract, isArray, isDefined, AbstractType, Type, Parameter, Invocation, Interceptor, Handler, Runtime, createResolveHandler, isFunction, isResolved } from '@tsdi/ioc';
import { ModelArgumentResolver, HandleContext } from '@tsdi/core';
import { DBPropertyMetadata, FieldResolveInterceptor, getModelFieldResolver, MissingModelFieldException, missingPropException, ModelFieldResolver } from './field.resolver';




/**
 * abstract model argument resolver. base implements {@link ModelArgumentResolver}.
 */
@Abstract()
export abstract class AbstractModelArgumentResolver<TOutput = any> implements Interceptor<Parameter, TOutput, HandleContext> {

    abstract get runtime(): Runtime;
    abstract get fieldResolves(): FieldResolveInterceptor[] | null;

    private canResolve(parameter: Parameter, ctx: HandleContext): boolean {
        return this.hasModel(isFunction(parameter.provider) ? parameter.provider ?? parameter.type : parameter.type) && this.hasFields(parameter, ctx)
    }

    intercept(parameter: Parameter, next: Handler<Parameter, TOutput, HandleContext>, ctx: HandleContext): TOutput {
        if (!this.canResolve(parameter, ctx)) return next.handle(parameter, ctx);

        const classType = (parameter.provider ?? parameter.type) as Type;
        const fields = this.getFields(parameter, ctx);
        if (!fields) {
            throw missingPropException(classType)
        }
        if (parameter.multi && isArray(fields)) {
            return fields.map(arg => this.resolveModel(classType, ctx, arg)) as any
        }
        return this.resolveModel(classType, ctx, fields)
    }

    // canResolveModel(modelType: AbstractType, ctx: HandleContext, args: Record<string, any>, nullable?: boolean): boolean {
    //     return nullable || !this.getPropertyMeta(modelType).some(p => {
    //         if (this.hasModel(p.provider ?? p.type)) {
    //             return !this.canResolveModel(p.provider ?? p.type, ctx, args[p.name], p.nullable)
    //         }
    //         return !this.fieldResolver.canResolve(p, ctx, args, modelType)
    //     })
    // }

    resolveModel(modelType: Type, ctx: HandleContext, fields: Record<string, any>, nullable?: boolean): any {
        if (nullable && (!fields || Object.keys(fields).length < 1)) {
            return null
        }
        if (!fields) {
            throw missingPropException(modelType)
        }

        const props = this.getPropertyMeta(modelType);
        // const missings = props.filter(p => !(this.hasModel(p.provider ?? p.type) ?
        //     this.canResolveModel(p.provider ?? p.type, ctx, fields[p.name], p.nullable)
        //     : this.fieldResolver.canResolve(p, ctx, fields, modelType)));
        // if (missings.length) {
        //     throw new MissingModelFieldException(missings, modelType)
        // }

        const missings: DBPropertyMetadata[] = [];
        const model = this.createInstance(modelType as Type);
        props.forEach(prop => {
            let val: any;
            if (this.hasModel(prop.provider ?? prop.type)) {
                val = this.resolveModel(prop.provider ?? prop.type as Type, ctx, fields[prop.propertyKey], prop.nullable)
            } else {
                val = this.fieldResolver.handle([prop, fields, modelType], ctx, {
                    next: (res) => {
                        if (isResolved(res)) {
                            return res
                        } else {
                            missings.push(prop);
                        }
                    },
                    error: (err) => {
                        throw err
                    }
                })
            }
            if (isDefined(val)) {
                model[prop.propertyKey] = val
            }
        });
        if (missings.length) {
            throw new MissingModelFieldException(missings, modelType)
        }
        return model
    }

    protected createInstance(model: Type) {
        return new model()
    }

    private _resolver!: ModelFieldResolver;
    protected get fieldResolver(): ModelFieldResolver {
        if (!this._resolver) {
            this._resolver = createResolveHandler(this.runtime,
                [
                    (input, next, context) => {
                        const [prop, fields, target] = input;
                        if (prop.nullable === true
                            || (fields && isDefined(fields[prop.propertyKey] ?? prop.default))
                            || (context.request as { method: string })?.method?.toUpperCase() !== 'PUT' && prop.primary === true
                        ) {
                            return next(input, context);
                        }
                    },
                    ...this.fieldResolves ?? [],
                ],
                getModelFieldResolver(this.runtime)
            );
        }
        return this._resolver
    }

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
    protected abstract hasFields<T>(parameter: Parameter<T>, ctx: HandleContext): boolean;
    /**
     * get model fields in context.
     */
    protected abstract getFields<T>(parameter: Parameter<T>, ctx: HandleContext): Record<string, any>;
}



/**
 * model resolver.
 */
class ModelResolver<TOutput = any> extends AbstractModelArgumentResolver<TOutput> {

    constructor(readonly runtime: Runtime, private option: ModelResolveOption) {
        super()
    }

    protected override createInstance(model: AbstractType) {
        return this.option.createInstance ? this.option.createInstance(model) : super.createInstance(model as Type)
    }

    get fieldResolves(): FieldResolveInterceptor[] | null {
        return this.option.fieldResolvers ?? null
    }
    hasModel(type: AbstractType<any>): boolean {
        return this.option.isModel(type)
    }
    getPropertyMeta(type: AbstractType<any>): DBPropertyMetadata<any>[] {
        return this.option.getPropertyMeta(type)
    }

    protected hasFields(parameter: Parameter<any>, ctx: HandleContext): boolean {
        return this.option.hasField ? this.option.hasField(parameter, ctx) : !!this.getFields(parameter, ctx)
    }

    protected getFields(parameter: Parameter<any>, ctx: HandleContext): Record<string, any> {
        return this.option.getFields(parameter, ctx)
    }
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
    hasField?: (parameter: Parameter<any>, ctx: HandleContext) => boolean;
    /**
     * get model fields in context.
     */
    getFields: (parameter: Parameter<any>, ctx: HandleContext) => Record<string, any>;
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
export function createModelResolver<TOutput>(runtime: Runtime, option: ModelResolveOption): ModelArgumentResolver<TOutput> {
    return new ModelResolver<TOutput>(runtime, option)
}
