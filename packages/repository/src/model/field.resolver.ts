import { InvocationContext, isDefined, isFunction, isNil, PropertyMetadata, Type, object2string } from '@tsdi/ioc';
import { PipeTransform, TransportArgumentExecption } from '@tsdi/core';

/**
 * db property metadata. model parameter of {@link ModelFieldResolver} 
 *
 * @export
 * @interface DBPropertyMetadata
 * @extends {PropertyMetadata}
 */
export interface DBPropertyMetadata<T = any> extends PropertyMetadata {
    /**
     * the provider for this property.
     *
     * @type {Token}
     * @memberof Provide
     */
    provider?: Type<T>;
    /**
     * property type.
     */
    type: Type;
    /**
     * property key.
     */
    name: string;
    /**
     * db type.
     */
    dbtype?: string;
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
}

/**
 * Resolver filed of an model.
 */
export interface ModelFieldResolver<C = any> {
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
 * Missing model field execption.
 */
export class MissingModelFieldExecption extends TransportArgumentExecption {
    constructor(fields: DBPropertyMetadata[], type: Type) {
        super(`ailed to resolve model class ${object2string(type)} because the following required fields were missing: [ ${fields.map(p => object2string(p)).join(',\n')} ]`)
    }
}

/**
 * compose resolver for an field of an model.
 * @param filter compose fiter
 * @param resolvers resolves of the group.
 * @returns 
 */
export function composeFieldResolver<T extends ModelFieldResolver, TP extends DBPropertyMetadata = DBPropertyMetadata>(
    filter: (prop: TP, ctx: InvocationContext, fields: Record<string, any>) => boolean,
    ...resolvers: T[]): ModelFieldResolver {
    return {
        canResolve: (prop: TP, ctx, fields, target) => filter(prop, ctx, fields) && resolvers.some(r => r.canResolve(prop, ctx, fields, target)),
        resolve: (prop: TP, ctx, fields, target) => {
            let result: any;
            resolvers.some(r => {
                if (r.canResolve(prop, ctx, fields, target)) {
                    result = r.resolve(prop, ctx, fields, target);
                    return isDefined(result)
                }
                return false
            });
            return result ?? null
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

/**
 * missing pipe error.
 * @param prop property metadata.
 * @param type target type.
 * @returns instance of {@link TransportArgumentExecption}
 */
export function missingPropPipe(prop: DBPropertyMetadata, type?: Type) {
    return new TransportArgumentExecption(`missing pipe to transform property ${prop.name} of class ${type}`)
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
                const value = args[prop.name] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.get<PipeTransform>('enum');
                if (!pipe) throw missingPropPipe(prop, target)
                return pipe.transform(value, prop.enum)
            }
        },
        {
            canResolve: (prop, ctx, args) => boolExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.name];
                if (isNil(value)) return null;
                const pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('boolean');
                if (!pipe) throw missingPropPipe(prop, target);
                return pipe.transform(value)
            }
        },
        {
            canResolve: (prop, ctx, args) => intExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.name] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('int');
                if (!pipe) throw missingPropPipe(prop, target);
                return pipe.transform(value)
            }
        },
        {
            canResolve: (prop, ctx, args) => floatExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.name] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('float');
                if (!pipe) throw missingPropPipe(prop, target);
                return pipe.transform(value, prop.precision)
            }
        },
        {
            canResolve: (prop, ctx, args) => doubleExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.name] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('double');
                if (!pipe) throw missingPropPipe(prop, target);
                return pipe.transform(value, prop.precision)
            }
        },
        {
            canResolve: (prop, ctx, args) => decExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.name] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('number');
                if (!pipe) throw missingPropPipe(prop, target);
                return pipe.transform(value, prop.precision)
            }
        },
        {
            canResolve: (prop, ctx, args) => strExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.name] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('string');
                if (!pipe) throw missingPropPipe(prop, target);
                return pipe.transform(value, prop.length)
            }
        },
        {
            canResolve: (prop, ctx, args) => jsonExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.name] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('json');
                if (!pipe) throw missingPropPipe(prop, target);
                return pipe.transform(value)
            }
        },
        {
            canResolve: (prop, ctx, args) => bufferExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.name] ?? prop.default;
                const dbtype = prop.dbtype!;
                if (isNil(value)) return null;
                let pipeName = 'buffer';
                if (dbtype === 'image') {
                    pipeName = 'image'
                } else if (row.test(dbtype)) {
                    pipeName = 'row';
                } else if (blob.test(dbtype)) {
                    pipeName = 'blob'
                } else if (clob.test(dbtype)) {
                    pipeName = 'clob'
                }

                const pipe = ctx.get<PipeTransform>(dbtype) ?? ctx.get<PipeTransform>(pipeName);
                if (!pipe) throw missingPropPipe(prop, target);
                return pipe.transform(value)
            }
        },
        {
            canResolve: (prop, ctx, args) => dateExp.test(prop.dbtype!),
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.name] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('date');
                if (!pipe) throw missingPropPipe(prop, target);
                return pipe.transform(value)
            }
        }
    ),
    {
        canResolve: (prop, ctx, args) => !prop.mutil && isFunction(prop.provider ?? prop.type),
        resolve: (prop, ctx, args, target) => {
            const value = args[prop.name] ?? prop.default;
            if (isNil(value)) return null;
            const pipe = ctx.get<PipeTransform>((prop.provider ?? prop.type)?.name.toLowerCase());
            if (!pipe) throw missingPropPipe(prop, target);
            return pipe.transform(value)
        }
    }
];

/**
 * missing property execption. 
 * @param type 
 * @returns argument execption {@link TransportArgumentExecption}.
 */
export function missingPropExecption(type?: Type) {
    return new TransportArgumentExecption(`missing modle properties of class ${type}`)
}

