import { Abstract, EMPTY, InvocationContext, isArray, isDefined, isFunction, isNil, PropertyMetadata, tokenId, Type } from '@tsdi/ioc';
import { Context } from '../middlewares/context';
import { TrasportArgumentResolver, TrasportParameter } from '../middlewares/resolver';
import { ArgumentError, PipeTransform } from '../pipes/pipe';

/**
 * model parameter argument of an {@link OperationInvoker}.
 */
export interface ModelArgumentResolver<C extends Context = Context> extends TrasportArgumentResolver<C> { }

/**
 * db property metadata. model parameter of {@link ModelFieldResolver} 
 *
 * @export
 * @interface DBPropertyMetadata
 * @extends {PropertyMetadata}
 */
export interface DBPropertyMetadata<T = any> extends PropertyMetadata {
    /**
     * this type provide from.
     *
     * @type {Token}
     * @memberof Provide
     */
    provider?: Type<T>;
    type: Type;
    /**
     * Indicates if this column is a primary key.
     * Same can be achieved when @PrimaryColumn decorator is used.
     */
    primary?: boolean;
    /**
     * Indicates if column's value can be set to NULL.
     */
    nullable?: boolean;
    /**
     * Default database value.
     */
    default?: any;
    /**
     * The precision for a decimal (exact numeric) column (applies only for decimal column), which is the maximum
     * number of digits that are stored for the values.
     */
    precision?: number | null;
    /**
     * Column type's length. Used only on some column types.
     * For example type = "string" and length = "100" means that ORM will create a column with type varchar(100).
     */
    length?: string | number;
    /**
     * Column type's display width. Used only on some column types in MySQL.
     * For example, INT(4) specifies an INT with a display width of four digits.
     */
    width?: number;

    /**
     * Array of possible enumerated values.
     */
    enum?: (string | number)[] | Object;

    propertyKey: string;
    dbtype?: string;
}

/**
 * Resolver for an model filed of an {@link ModelArgumentResolver}
 */
export interface ModelFieldResolver<C extends Context = Context> {
    /**
     * Return whether an argument of the given {@code prop} can be resolved.
     * @param prop argument type
     * @param args gave field values
     */
    canResolve(prop: DBPropertyMetadata, ctx: InvocationContext<C>, fields: Record<string, any>, target?: Type): boolean;
    /**
     * Resolves an argument of the given {@code prop}.
     * @param prop argument type
     * @param fields gave field values
     */
    resolve<T>(prop: DBPropertyMetadata<T>, ctx: InvocationContext<C>, args: Record<string, any>, target?: Type): T | null;
}

/**
 * Missing model field errror.
 */
export class MissingModelFieldError extends Error {
    constructor(fields: DBPropertyMetadata[], type: Type) {
        super(`ailed to resolve model class ${type} because the following required fields were missing: ${fields.map(p => JSON.stringify(p)).join('\n')}`);
        Object.setPrototypeOf(this, MissingModelFieldError.prototype);
        Error.captureStackTrace(this);
    }
}

/**
 * compose resolver for an field of an {@link ModelArgumentResolver}.
 * @param filter compose fiter
 * @param resolvers resolves of the group.
 * @returns 
 */
export function composeFieldResolver<T extends ModelFieldResolver, TP extends DBPropertyMetadata = DBPropertyMetadata>(filter: (prop: TP, ctx: InvocationContext, fields: Record<string, any>) => boolean, ...resolvers: T[]): ModelFieldResolver {
    return {
        canResolve: (prop: TP, ctx, fields, target) => filter(prop, ctx, fields) && resolvers.some(r => r.canResolve(prop, ctx, fields, target)),
        resolve: (prop: TP, ctx, fields, target) => {
            let result: any;
            resolvers.some(r => {
                if (r.canResolve(prop, ctx, fields, target)) {
                    result = r.resolve(prop, ctx, fields, target);
                    return isDefined(result);
                }
                return false;
            });
            return result ?? null;
        }
    }
}

const intExp = /^((tiny|small|medium|big)?int\w*|long)$/;
const floatExp = /^float\d*$/;
const doubleExp = /^double(\sprecision)?$/;
const decExp = /^(\w*decimal|dec|real|numeric|number)$/;
const dateExp = /^((\s|\w)*time(\s|\w)*|\w*date)$/;
const boolExp = /^(bool|boolean|bit|varbit)$/;
const strExp = /^(uuid|string|\w*text|(\s|\w)*char(\s|\w)*)$/;
const bufferExp = /^(\w*binary|\w*blob|\w*bytes|(\s|\w)*raw|image|\w*clob)$/;
const row = /^(\s|\w)*raw$/;
const blob = /^\w*blob$/;
const clob = /^\w*clob$/;

const jsonExp = /^(\s|\w)*json(b)?$/;

export function missingPropPipeError(prop: DBPropertyMetadata, type?: Type) {
    return new ArgumentError(`missing pipe to transform property ${prop.propertyKey} of class ${type}`);
}


/**
 * defauts model field resolvers.
 */
export const MODEL_FIELD_RESOLVERS: ModelFieldResolver[] = [
    composeFieldResolver(
        (prop, ctx, args) => isDefined(prop.dbtype),
        {
            canResolve: (prop, ctx, args) => prop.dbtype === 'enum',
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.propertyKey] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.injector.get<PipeTransform>('enum');
                if (!pipe) throw missingPropPipeError(prop, target)
                return pipe.transform(value, prop.enum);
            }
        },
        {
            canResolve: (prop, ctx, args) => boolExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.propertyKey];
                if (isNil(value)) return null;
                const pipe = ctx.injector.get<PipeTransform>(prop.dbtype!) ?? ctx.injector.get<PipeTransform>('boolean');
                if (!pipe) throw missingPropPipeError(prop, target);
                return pipe.transform(value);
            }
        },
        {
            canResolve: (prop, ctx, args) => intExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.propertyKey] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.injector.get<PipeTransform>(prop.dbtype!) ?? ctx.injector.get<PipeTransform>('int');
                if (!pipe) throw missingPropPipeError(prop, target);
                return pipe.transform(value);
            }
        },
        {
            canResolve: (prop, ctx, args) => floatExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.propertyKey] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.injector.get<PipeTransform>(prop.dbtype!) ?? ctx.injector.get<PipeTransform>('float');
                if (!pipe) throw missingPropPipeError(prop, target);
                return pipe.transform(value, prop.precision);
            }
        },
        {
            canResolve: (prop, ctx, args) => doubleExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.propertyKey] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.injector.get<PipeTransform>(prop.dbtype!) ?? ctx.injector.get<PipeTransform>('double');
                if (!pipe) throw missingPropPipeError(prop, target);
                return pipe.transform(value, prop.precision);
            }
        },
        {
            canResolve: (prop, ctx, args) => decExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.propertyKey] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.injector.get<PipeTransform>(prop.dbtype!) ?? ctx.injector.get<PipeTransform>('number');
                if (!pipe) throw missingPropPipeError(prop, target);
                return pipe.transform(value, prop.precision);
            }
        },
        {
            canResolve: (prop, ctx, args) => strExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.propertyKey] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.injector.get<PipeTransform>(prop.dbtype!) ?? ctx.injector.get<PipeTransform>('string');
                if (!pipe) throw missingPropPipeError(prop, target);
                return pipe.transform(value, prop.length);
            }
        },
        {
            canResolve: (prop, ctx, args) => jsonExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.propertyKey] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.injector.get<PipeTransform>(prop.dbtype!) ?? ctx.injector.get<PipeTransform>('json');
                if (!pipe) throw missingPropPipeError(prop, target);
                return pipe.transform(value);
            }
        },
        {
            canResolve: (prop, ctx, args) => bufferExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.propertyKey] ?? prop.default;
                const dbtype = prop.dbtype!;
                if (isNil(value)) return null;
                let pipeName = '';
                if (dbtype === 'image') {
                    pipeName = 'image';
                } else if (row.test(dbtype)) {
                    pipeName = 'row';
                } else if (blob.test(dbtype)) {
                    pipeName = 'blob';
                } else if (clob.test(dbtype)) {
                    pipeName = 'clob';
                }

                const pipe = ctx.injector.get<PipeTransform>(dbtype) ?? ctx.injector.get<PipeTransform>(pipeName || 'buffer');
                if (!pipe) throw missingPropPipeError(prop, target);
                return pipe.transform(value);
            }
        },
        {
            canResolve: (prop, ctx, args) => dateExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.propertyKey] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.injector.get<PipeTransform>(prop.dbtype!) ?? ctx.injector.get<PipeTransform>('date');
                if (!pipe) throw missingPropPipeError(prop, target);
                return pipe.transform(value);
            }
        }
    ),
    {
        canResolve: (prop, ctx, args) => !prop.mutil && isFunction(prop.provider ?? prop.type),
        resolve: (prop, ctx, args, target) => {
            const value = args[prop.propertyKey] ?? prop.default;
            if (isNil(value)) return null;
            const pipe = ctx.injector.get<PipeTransform>((prop.provider ?? prop.type)?.name.toLowerCase());
            if (!pipe) throw missingPropPipeError(prop, target);
            return pipe.transform(value);
        }
    }
];


export function missingPropError(type?: Type) {
    return new ArgumentError(`missing modle properties of class ${type}`);
}


/**
 * base model argument resolver.
 */
@Abstract()
export abstract class BaseModelArgumentResolver<C extends Context = Context> implements ModelArgumentResolver {

    abstract get resolvers(): ModelFieldResolver[];

    canResolve(parameter: TrasportParameter<any>, ctx: InvocationContext<C>): boolean {
        return this.isModel(parameter.provider ?? parameter.type as Type);
    }

    resolve<T>(parameter: TrasportParameter<T>, ctx: InvocationContext<C>): T {
        const classType = (parameter.provider ?? parameter.type) as Type;
        const fields = parameter.field ? ctx.arguments.request.body[parameter.field] : ctx.arguments.request.body;
        if (!fields) {
            throw missingPropError(classType);
        }
        if (parameter.mutil && isArray(fields)) {
            return fields.map(arg => this.resolveModel(classType, ctx, arg)) as any;
        }
        return this.resolveModel(classType, ctx, fields);
    }

    canResolveModel(model: Type, ctx: InvocationContext<C>, args: Record<string, any>, nullable?: boolean): boolean {
        return nullable || !this.getPropertyMeta(model).some(p => {
            if (this.isModel(p.provider ?? p.type)) {
                return !this.canResolveModel(p.provider ?? p.type, ctx, args[p.propertyKey], p.nullable);
            }
            return !this.fieldResolver.canResolve(p, ctx, args, model);
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
            this.canResolveModel(p.provider ?? p.type, ctx, fields[p.propertyKey], p.nullable) : this.fieldResolver.canResolve(p, ctx, fields, modelType)));
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
                    || (ctx.method.toLowerCase() !== 'put' && p.primary === true),
                ...this.resolvers ?? EMPTY,
                ...MODEL_FIELD_RESOLVERS);
        }
        return this._resolver;
    }

    protected abstract isModel(type: Type): boolean;
    protected abstract getPropertyMeta(type: Type): DBPropertyMetadata[];
}

/**
 * model argument resolvers.
 */
export const MODEL_RESOLVERS = tokenId<ModelArgumentResolver[]>('MODEL_RESOLVERS');
