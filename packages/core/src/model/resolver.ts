import { Abstract, EMPTY, Injector, isArray, isDefined, isFunction, isNil, PropertyMetadata, tokenId, Type } from '@tsdi/ioc';
import { TrasportArgumentResolver, TrasportParameter } from '../middlewares/resolver';
import { ArgumentError, PipeTransform } from '../pipes/pipe';

/**
 * model parameter argument of an {@link OperationInvoker}.
 */
export interface ModelArgumentResolver extends TrasportArgumentResolver { }

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
export interface ModelFieldResolver {
    /**
     * Return whether an argument of the given {@code prop} can be resolved.
     * @param prop argument type
     * @param args gave arguments
     */
    canResolve(prop: DBPropertyMetadata, args: Record<string, any>, target?: Type): boolean;
    /**
     * Resolves an argument of the given {@code prop}.
     * @param prop argument type
     * @param args gave arguments
     */
    resolve<T>(prop: DBPropertyMetadata<T>, args: Record<string, any>, target?: Type): T | null;
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
export function composeFieldResolver<T extends ModelFieldResolver, TP extends DBPropertyMetadata = DBPropertyMetadata>(filter: (prop: TP, args: Record<string, any>) => boolean, ...resolvers: T[]): ModelFieldResolver {
    return {
        canResolve: (prop: TP, args: Record<string, any>, target?: Type) => filter(prop, args) && resolvers.some(r => r.canResolve(prop, args, target)),
        resolve: (prop: TP, args: Record<string, any>, target?: Type) => {
            let result: any;
            resolvers.some(r => {
                if (r.canResolve(prop, args, target)) {
                    result = r.resolve(prop, args, target);
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

export function fieldResolvers(injector: Injector, options?: {
    isEnum?: (dbtype: string) => boolean,
    isBoolean?: (dbtype: string) => boolean,
    isInt?: (dbtype: string) => boolean,
    isFloat?: (dbtype: string) => boolean,
    isDouble?: (dbtype: string) => boolean,
    isDecimal?: (dbtype: string) => boolean,
    isString?: (dbtype: string) => boolean,
    isDate?: (dbtype: string) => boolean,
}): ModelFieldResolver[] {
    let option = {
        isEnum: (dbtype: string) => dbtype === 'enum',
        isBoolean: (dbtype: string) => boolExp.test(dbtype),
        isInt: (dbtype: string) => intExp.test(dbtype),
        isFloat: (dbtype: string) => floatExp.test(dbtype),
        isDouble: (dbtype: string) => doubleExp.test(dbtype),
        isDecimal: (dbtype: string) => decExp.test(dbtype),
        isString: (dbtype: string) => strExp.test(dbtype),
        isDate: (dbtype: string) => dateExp.test(dbtype),
        isBuffer: (dbtype: string) => bufferExp.test(dbtype),
        isJson: (dbtype: string) => jsonExp.test(dbtype),
        ...options
    };

    return [
        composeFieldResolver(
            (prop, args) => isDefined(prop.dbtype),
            {
                canResolve: (prop, args) => option.isEnum(prop.dbtype!),
                resolve: (prop, args, target) => {
                    const value = args[prop.propertyKey];
                    if (isNil(value)) return null;
                    const pipe = injector.get<PipeTransform>('enum');
                    if (!pipe) throw missingPropPipeError(prop, target)
                    return pipe.transform(value, prop.enum);
                }
            },
            {
                canResolve: (prop, args) => option.isBoolean(prop.dbtype!),
                resolve: (prop, args, target) => {
                    const value = args[prop.propertyKey];
                    if (isNil(value)) return null;
                    const pipe = injector.get<PipeTransform>(prop.dbtype!) ?? injector.get<PipeTransform>('boolean');
                    if (!pipe) throw missingPropPipeError(prop, target);
                    return pipe.transform(value);
                }
            },
            {
                canResolve: (prop, args) => option.isInt(prop.dbtype!),
                resolve: (prop, args, target) => {
                    const value = args[prop.propertyKey];
                    if (isNil(value)) return null;
                    const pipe = injector.get<PipeTransform>(prop.dbtype!) ?? injector.get<PipeTransform>('int');
                    if (!pipe) throw missingPropPipeError(prop, target);
                    return pipe.transform(value);
                }
            },
            {
                canResolve: (prop, args) => option.isFloat(prop.dbtype!),
                resolve: (prop, args, target) => {
                    const value = args[prop.propertyKey];
                    if (isNil(value)) return null;
                    const pipe = injector.get<PipeTransform>(prop.dbtype!) ?? injector.get<PipeTransform>('float');
                    if (!pipe) throw missingPropPipeError(prop, target);
                    return pipe.transform(value, prop.precision);
                }
            },
            {
                canResolve: (prop, args) => option.isDouble(prop.dbtype!),
                resolve: (prop, args, target) => {
                    const value = args[prop.propertyKey];
                    if (isNil(value)) return null;
                    const pipe = injector.get<PipeTransform>(prop.dbtype!) ?? injector.get<PipeTransform>('double');
                    if (!pipe) throw missingPropPipeError(prop, target);
                    return pipe.transform(value, prop.precision);
                }
            },
            {
                canResolve: (prop, args) => option.isDecimal(prop.dbtype!),
                resolve: (prop, args, target) => {
                    const value = args[prop.propertyKey];
                    if (isNil(value)) return null;
                    const pipe = injector.get<PipeTransform>(prop.dbtype!) ?? injector.get<PipeTransform>('number');
                    if (!pipe) throw missingPropPipeError(prop, target);
                    return pipe.transform(value, prop.precision);
                }
            },
            {
                canResolve: (prop, args) => option.isString(prop.dbtype!),
                resolve: (prop, args, target) => {
                    const value = args[prop.propertyKey];
                    if (isNil(value)) return null;
                    const pipe = injector.get<PipeTransform>(prop.dbtype!) ?? injector.get<PipeTransform>('string');
                    if (!pipe) throw missingPropPipeError(prop, target);
                    return pipe.transform(value, prop.length);
                }
            },
            {
                canResolve: (prop, args) => option.isJson(prop.dbtype!),
                resolve: (prop, args, target) => {
                    const value = args[prop.propertyKey];
                    if (isNil(value)) return null;
                    const pipe = injector.get<PipeTransform>(prop.dbtype!) ?? injector.get<PipeTransform>('json');
                    if (!pipe) throw missingPropPipeError(prop, target);
                    return pipe.transform(value);
                }
            },
            {
                canResolve: (prop, args) => option.isBuffer(prop.dbtype!),
                resolve: (prop, args, target) => {
                    const value = args[prop.propertyKey];
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

                    const pipe = injector.get<PipeTransform>(dbtype) ?? injector.get<PipeTransform>(pipeName || 'buffer');
                    if (!pipe) throw missingPropPipeError(prop, target);
                    return pipe.transform(value);
                }
            },
            {
                canResolve: (prop, args) => option.isDate(prop.dbtype!),
                resolve: (prop, args, target) => {
                    const value = args[prop.propertyKey];
                    if (isNil(value)) return null;
                    const pipe = injector.get<PipeTransform>(prop.dbtype!) ?? injector.get<PipeTransform>('date');
                    if (!pipe) throw missingPropPipeError(prop, target);
                    return pipe.transform(value);
                }
            }
        ),
        {
            canResolve: (prop, args) => !prop.mutil && isFunction(prop.provider ?? prop.type),
            resolve: (prop, args, target) => {
                const value = args[prop.propertyKey];
                if (isNil(value)) return null;
                const pipe = injector.get<PipeTransform>((prop.provider ?? prop.type)?.name.toLowerCase());
                if (!pipe) throw missingPropPipeError(prop, target);
                return pipe.transform(value);
            }
        }
    ]
}

/**
 * base model argument resolver.
 */
@Abstract()
export abstract class BaseModelArgumentResolver implements ModelArgumentResolver {


    abstract get resolvers(): ModelFieldResolver[];


    canResolve(parameter: TrasportParameter<any>, args: Record<string, any>): boolean {
        const modelType = (parameter.provider ?? parameter.type) as Type;
        return this.isModel(modelType) && !this.getPropertyMeta(modelType).some(p => {
            if (this.isModel(p.provider ?? p.type)) {
                return !this.canResolve({ type: p.type, provider: p.provider, mutil: p.mutil, paramName: p.propertyKey }, args[p.propertyKey]);
            }
            return !this.fieldResolver.canResolve(p, args, modelType);
        });
    }

    resolve<T>(parameter: TrasportParameter<T>, args: Record<string, any>): T {
        const classType = (parameter.provider ?? parameter.type) as Type;
        if (parameter.mutil && isArray(args)) {
            return args.map(arg => this.resolve({ provider: classType, type: classType, paramName: parameter.paramName }, arg)) as any;
        }
        const model = this.createInstance(classType);
        const fields = this.getPropertyMeta(classType);

        const missings = fields.filter(p => !this.fieldResolver.canResolve(p, args, classType));
        if (missings.length) {
            throw new MissingModelFieldError(missings, classType);
        }
        fields.forEach(prop => {
            if (this.isModel(prop.provider ?? prop.type)) {
                model[prop.propertyKey] = this.resolve({ type: prop.type, provider: prop.provider, mutil: prop.mutil, paramName: prop.propertyKey }, args[prop.propertyKey]);
            }
            model[prop.propertyKey] = this.fieldResolver.resolve(prop, args, classType);
        });
        return model;
    }

    protected createInstance(model: Type) {
        return new model();
    }

    private _resolver!: ModelFieldResolver;
    protected get fieldResolver(): ModelFieldResolver {
        if (!this._resolver) {
            this._resolver = composeFieldResolver((p, args) => p.nullable || isDefined(args[p.propertyKey]), ...this.resolvers ?? EMPTY)
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
