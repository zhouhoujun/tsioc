import { Abstract, EMPTY, InvocationContext, isArray, isDefined, tokenId, Type, OperationInvoker, Parameter } from '@tsdi/ioc';
import { composeFieldResolver, DBPropertyMetadata, MissingModelFieldError, missingPropError, ModelFieldResolver, MODEL_FIELD_RESOLVERS } from './field.resolver';



/**
 * model parameter argument of an {@link OperationInvoker}.
 */
export interface ModelArgumentResolver<C = any> {
    /**
     * Return whether an argument of the given {@code parameter} can be resolved.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    canResolve(parameter: Parameter, ctx: InvocationContext<C>): boolean;
    /**
     * Resolves an argument of the given {@code parameter}.
     * @param parameter argument type
     * @param ctx InvocationContext
     */
    resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<C>): T;
}

/**
 * abstract model argument resolver. base implements {@link ModelArgumentResolver}
 */
@Abstract()
export abstract class AbstractModelArgumentResolver<C = any> implements ModelArgumentResolver<C> {

    abstract get resolvers(): ModelFieldResolver[];

    canResolve(parameter: Parameter, ctx: InvocationContext<C>): boolean {
        return this.isModel(parameter.provider as Type ?? parameter.type) && this.hasFields(parameter, ctx);
    }

    resolve<T>(parameter: Parameter<T>, ctx: InvocationContext<C>): T {
        const classType = (parameter.provider ?? parameter.type) as Type;
        const fields = this.getFields(parameter, ctx);
        if (!fields) {
            throw missingPropError(classType);
        }
        if (parameter.mutil && isArray(fields)) {
            return fields.map(arg => this.resolveModel(classType, ctx, arg)) as any;
        }
        return this.resolveModel(classType, ctx, fields);
    }

    canResolveModel(modelType: Type, ctx: InvocationContext<C>, args: Record<string, any>, nullable?: boolean): boolean {
        return nullable || !this.getPropertyMeta(modelType).some(p => {
            if (this.isModel(p.provider ?? p.type)) {
                return !this.canResolveModel(p.provider ?? p.type, ctx, args[p.propertyKey], p.nullable);
            }
            return !this.fieldResolver.canResolve(p, ctx, args, modelType);
        })
    }

    resolveModel(modelType: Type, ctx: InvocationContext<C>, fields: Record<string, any>, nullable?: boolean): any {
        if (nullable && (!fields || Object.keys(fields).length < 1)) {
            return null;
        }
        if (!fields) {
            throw missingPropError(modelType);
        }

        const props = this.getPropertyMeta(modelType);
        const missings = props.filter(p => !(this.isModel(p.provider ?? p.type) ?
            this.canResolveModel(p.provider ?? p.type, ctx, fields[p.propertyKey], p.nullable)
            : this.fieldResolver.canResolve(p, ctx, fields, modelType)));
        if (missings.length) {
            throw new MissingModelFieldError(missings, modelType);
        }

        const model = this.createInstance(modelType);
        props.forEach(prop => {
            let val: any;
            if (this.isModel(prop.provider ?? prop.type)) {
                val = this.resolveModel(prop.provider ?? prop.type, ctx, fields[prop.propertyKey], prop.nullable);
            } else {
                val = this.fieldResolver.resolve(prop, ctx, fields, modelType);
            }
            if (isDefined(val)) {
                model[prop.propertyKey] = val;
            }
        });
        return model;
    }

    protected createInstance(model: Type) {
        return new model();
    }

    private _resolver!: ModelFieldResolver;
    protected get fieldResolver(): ModelFieldResolver {
        if (!this._resolver) {
            this._resolver = composeFieldResolver(
                (p, ctx, fields) => p.nullable === true
                    || (fields && isDefined(fields[p.propertyKey] ?? p.default))
                    || (!this.isUpdate(ctx) && p.primary === true),
                ...this.resolvers ?? EMPTY,
                ...MODEL_FIELD_RESOLVERS);
        }
        return this._resolver;
    }

    protected abstract isModel(type: Type | undefined): boolean;
    protected abstract getPropertyMeta(type: Type): DBPropertyMetadata[];
    protected abstract hasFields(parameter: Parameter, ctx: InvocationContext<C>): boolean;
    protected abstract getFields(parameter: Parameter, ctx: InvocationContext<C>): Record<string, any>;
    protected abstract isUpdate(ctx: InvocationContext<C>): boolean;
}

/**
 * model argument resolvers mutil token.
 * provider instances of {@link ModelArgumentResolver}
 */
export const MODEL_RESOLVERS = tokenId<ModelArgumentResolver[]>('MODEL_RESOLVERS');


class ModelResolver<C = any> extends AbstractModelArgumentResolver<C> {


    constructor(private option: ModelResolveOption<C>) {
        super();
    }

    protected override createInstance(model: Type) {
        return this.option.createInstance ? this.option.createInstance(model) : super.createInstance(model);
    }

    get resolvers(): ModelFieldResolver<C>[] {
        return this.option.fieldResolvers ?? EMPTY;
    }
    protected isModel(type: Type<any>): boolean {
        return this.option.isModel(type);
    }
    protected getPropertyMeta(type: Type<any>): DBPropertyMetadata<any>[] {
        return this.option.getPropertyMeta(type);
    }

    protected isUpdate(ctx: InvocationContext<C>): boolean {
        return this.option.isUpdate(ctx);
    }

    protected hasFields(parameter: Parameter<any>, ctx: InvocationContext<C>): boolean {
        return this.option.hasField ? this.option.hasField(parameter, ctx) : !!this.getFields(parameter, ctx);
    }

    protected getFields(parameter: Parameter<any>, ctx: InvocationContext<C>): Record<string, any> {
        return this.option.getFields(parameter, ctx);
    }
}


export interface ModelResolveOption<C> {
    isModel(type: Type): boolean;
    createInstance?<T>(model: Type<T>): T;
    getPropertyMeta: (type: Type) => DBPropertyMetadata[];
    hasField?: (parameter: Parameter<any>, ctx: InvocationContext<C>) => boolean;
    getFields: (parameter: Parameter<any>, ctx: InvocationContext<C>) => Record<string, any>;
    isUpdate(ctx: InvocationContext<C>): boolean;
    fieldResolvers?: ModelFieldResolver[];
}

/**
 * model resolver factory. create resolver for {@link OperationInvoker}.
 * @param option create option, type of {@link ModelResolveOption}.
 * @returns model resolver instance of {@link ModelArgumentResolver}.
 */
export function createModelResolver<C = any>(option: ModelResolveOption<C>): ModelArgumentResolver<C> {
    return new ModelResolver<C>(option);
}
