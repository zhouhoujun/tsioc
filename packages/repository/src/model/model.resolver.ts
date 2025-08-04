import { Abstract, isArray, isDefined, Type, ClassType, Parameter, Invocation, Empty } from '@tsdi/ioc';
import { ModelArgumentResolver, HandleContext } from '@tsdi/core';
import { composeFieldResolver, DBPropertyMetadata, MissingModelFieldException, missingPropException, ModelFieldResolver, MODEL_FIELD_RESOLVERS } from './field.resolver';




/**
 * abstract model argument resolver. base implements {@link ModelArgumentResolver}.
 */
@Abstract()
export abstract class AbstractModelArgumentResolver implements ModelArgumentResolver {

    abstract get resolvers(): ModelFieldResolver[] | null;

    canResolve(parameter: Parameter, ctx: HandleContext): boolean {
        return this.hasModel(parameter.provider as Type ?? parameter.type) && this.hasFields(parameter, ctx)
    }

    resolve<T>(parameter: Parameter, ctx: HandleContext): T {
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

    canResolveModel(modelType: Type, ctx: HandleContext, args: Record<string, any>, nullable?: boolean): boolean {
        return nullable || !this.getPropertyMeta(modelType).some(p => {
            if (this.hasModel(p.provider ?? p.type)) {
                return !this.canResolveModel(p.provider ?? p.type, ctx, args[p.name], p.nullable)
            }
            return !this.fieldResolver.canResolve(p, ctx, args, modelType)
        })
    }

    resolveModel(modelType: Type, ctx: HandleContext, fields: Record<string, any>, nullable?: boolean): any {
        if (nullable && (!fields || Object.keys(fields).length < 1)) {
            return null
        }
        if (!fields) {
            throw missingPropException(modelType)
        }

        const props = this.getPropertyMeta(modelType);
        const missings = props.filter(p => !(this.hasModel(p.provider ?? p.type) ?
            this.canResolveModel(p.provider ?? p.type, ctx, fields[p.name], p.nullable)
            : this.fieldResolver.canResolve(p, ctx, fields, modelType)));
        if (missings.length) {
            throw new MissingModelFieldException(missings, modelType)
        }

        const model = this.createInstance(modelType as ClassType);
        props.forEach(prop => {
            let val: any;
            if (this.hasModel(prop.provider ?? prop.type)) {
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

    protected createInstance(model: ClassType) {
        return new model()
    }

    private _resolver!: ModelFieldResolver;
    protected get fieldResolver(): ModelFieldResolver {
        if (!this._resolver) {
            this._resolver = composeFieldResolver(
                (p, ctx, fields) => p.nullable === true
                    || (fields && isDefined(fields[p.name] ?? p.default))
                    || ((ctx as any).method?.toUpperCase() !== 'PUT' && p.primary === true),
                ...this.resolvers ?? Empty,
                ...MODEL_FIELD_RESOLVERS)
        }
        return this._resolver
    }

    /**
     * the type is model or not.
     * @param type class type.
     * @returns boolean.
     */
    abstract hasModel(type: Type | undefined): boolean;
    /**
     * get db property metadatas.
     */
    abstract getPropertyMeta(type: Type): DBPropertyMetadata[];
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
class ModelResolver extends AbstractModelArgumentResolver {

    constructor(private option: ModelResolveOption) {
        super()
    }

    protected override createInstance(model: Type) {
        return this.option.createInstance ? this.option.createInstance(model) : super.createInstance(model as ClassType)
    }

    get resolvers(): ModelFieldResolver[] | null {
        return this.option.fieldResolvers ?? null
    }
    hasModel(type: Type<any>): boolean {
        return this.option.isModel(type)
    }
    getPropertyMeta(type: Type<any>): DBPropertyMetadata<any>[] {
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
    hasField?: (parameter: Parameter<any>, ctx: HandleContext) => boolean;
    /**
     * get model fields in context.
     */
    getFields: (parameter: Parameter<any>, ctx: HandleContext) => Record<string, any>;
    /**
     * custom field resolvers.
     */
    fieldResolvers?: ModelFieldResolver[];
}

/**
 * model resolver factory. create resolver for {@link Invocation}.
 * @param option create option, type of {@link ModelResolveOption}.
 * @returns model resolver instance of {@link ModelArgumentResolver}.
 */
export function createModelResolver(option: ModelResolveOption): ModelArgumentResolver {
    return new ModelResolver(option)
}
