import { Abstract, EMPTY, isArray, isDefined, Type, Parameter, OperationInvoker } from '@tsdi/ioc';
import { ModelArgumentResolver, EndpointContext } from '@tsdi/core';
import { composeFieldResolver, DBPropertyMetadata, MissingModelFieldExecption, missingPropExecption, ModelFieldResolver, MODEL_FIELD_RESOLVERS } from './field.resolver';



/**
 * abstract model argument resolver. base implements {@link ModelArgumentResolver}.
 */
@Abstract()
export abstract class AbstractModelArgumentResolver<C = any> implements ModelArgumentResolver<C> {

    abstract get resolvers(): ModelFieldResolver[];

    canResolve(parameter: Parameter, ctx: EndpointContext): boolean {
        return this.isModel(parameter.provider as Type ?? parameter.type) && this.hasFields(parameter, ctx)
    }

    resolve<T>(parameter: Parameter<T>, ctx: EndpointContext): T {
        const classType = (parameter.provider ?? parameter.type) as Type;
        const fields = this.getFields(parameter, ctx);
        if (!fields) {
            throw missingPropExecption(classType)
        }
        if (parameter.mutil && isArray(fields)) {
            return fields.map(arg => this.resolveModel(classType, ctx, arg)) as any
        }
        return this.resolveModel(classType, ctx, fields)
    }

    canResolveModel(modelType: Type, ctx: EndpointContext, args: Record<string, any>, nullable?: boolean): boolean {
        return nullable || !this.getPropertyMeta(modelType).some(p => {
            if (this.isModel(p.provider ?? p.type)) {
                return !this.canResolveModel(p.provider ?? p.type, ctx, args[p.name], p.nullable)
            }
            return !this.fieldResolver.canResolve(p, ctx, args, modelType)
        })
    }

    resolveModel(modelType: Type, ctx: EndpointContext, fields: Record<string, any>, nullable?: boolean): any {
        if (nullable && (!fields || Object.keys(fields).length < 1)) {
            return null
        }
        if (!fields) {
            throw missingPropExecption(modelType)
        }

        const props = this.getPropertyMeta(modelType);
        const missings = props.filter(p => !(this.isModel(p.provider ?? p.type) ?
            this.canResolveModel(p.provider ?? p.type, ctx, fields[p.name], p.nullable)
            : this.fieldResolver.canResolve(p, ctx, fields, modelType)));
        if (missings.length) {
            throw new MissingModelFieldExecption(missings, modelType)
        }

        const model = this.createInstance(modelType);
        props.forEach(prop => {
            let val: any;
            if (this.isModel(prop.provider ?? prop.type)) {
                val = this.resolveModel(prop.provider ?? prop.type, ctx, fields[prop.name], prop.nullable)
            } else {
                val = this.fieldResolver.resolve(prop, ctx, fields, modelType)
            }
            if (isDefined(val)) {
                model[prop.name] = val
            }
        });
        return model
    }

    protected createInstance(model: Type) {
        return new model()
    }

    private _resolver!: ModelFieldResolver;
    protected get fieldResolver(): ModelFieldResolver {
        if (!this._resolver) {
            this._resolver = composeFieldResolver(
                (p, ctx, fields) => p.nullable === true
                    || (fields && isDefined(fields[p.name] ?? p.default))
                    || ((ctx as ServerEndpointContext).update === false && p.primary === true),
                ...this.resolvers ?? EMPTY,
                ...MODEL_FIELD_RESOLVERS)
        }
        return this._resolver
    }

    /**
     * the type is model or not.
     * @param type class type.
     * @returns boolean.
     */
    protected abstract isModel(type: Type | undefined): boolean;
    /**
     * get db property metadatas.
     */
    protected abstract getPropertyMeta(type: Type): DBPropertyMetadata[];
    /**
     * has model fields in context or not.
     */
    protected abstract hasFields(parameter: Parameter, ctx: ServerEndpointContext): boolean;
    /**
     * get model fields in context.
     */
    protected abstract getFields(parameter: Parameter, ctx: ServerEndpointContext): Record<string, any>;
}



/**
 * model resolver.
 */
class ModelResolver<C = any> extends AbstractModelArgumentResolver<C> {

    constructor(private option: ModelResolveOption<C>) {
        super()
    }

    protected override createInstance(model: Type) {
        return this.option.createInstance ? this.option.createInstance(model) : super.createInstance(model)
    }

    get resolvers(): ModelFieldResolver<C>[] {
        return this.option.fieldResolvers ?? EMPTY
    }
    protected isModel(type: Type<any>): boolean {
        return this.option.isModel(type)
    }
    protected getPropertyMeta(type: Type<any>): DBPropertyMetadata<any>[] {
        return this.option.getPropertyMeta(type)
    }

    protected hasFields(parameter: Parameter<any>, ctx: ServerEndpointContext): boolean {
        return this.option.hasField ? this.option.hasField(parameter, ctx) : !!this.getFields(parameter, ctx)
    }

    protected getFields(parameter: Parameter<any>, ctx: ServerEndpointContext): Record<string, any> {
        return this.option.getFields(parameter, ctx)
    }
}

/**
 * model resolve option.
 */
export interface ModelResolveOption<C> {
    /**
     * the type is model or not.
     * @param type class type.
     * @returns boolean.
     */
    isModel(type: Type): boolean;
    /**
     * create model instance.
     */
    createInstance?<T>(model: Type<T>): T;
    /**
     * get db property metadatas.
     */
    getPropertyMeta: (type: Type) => DBPropertyMetadata[];
    /**
     * has model fields in context or not.
     */
    hasField?: (parameter: Parameter<any>, ctx: ServerEndpointContext) => boolean;
    /**
     * get model fields in context.
     */
    getFields: (parameter: Parameter<any>, ctx: ServerEndpointContext) => Record<string, any>;
    /**
     * custom field resolvers.
     */
    fieldResolvers?: ModelFieldResolver[];
}

/**
 * model resolver factory. create resolver for {@link OperationInvoker}.
 * @param option create option, type of {@link ModelResolveOption}.
 * @returns model resolver instance of {@link ModelArgumentResolver}.
 */
export function createModelResolver<C = any>(option: ModelResolveOption<C>): ModelArgumentResolver<C> {
    return new ModelResolver<C>(option)
}
