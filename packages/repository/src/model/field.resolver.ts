import { InvocationContext, isDefined, isFunction, isNil, PropertyMetadata, AbstractType, object2string, ArgumentException, Type, ContextToken, HandlerScope, Platform, createResolveScope } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';

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
    type: AbstractType;
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
     * Indicates if column value is updated by "save" operation.
     * If false, you'll be able to write this value only when you first time insert the object.
     * Default value is "true".
     */
    update?: boolean;
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
export interface ModelFieldResolver {
    /**
     * Return whether an argument of the given {@code prop} can be resolved.
     * @param prop argument type
     * @param args gave field values
     */
    canResolve(prop: DBPropertyMetadata, ctx: InvocationContext, fields: Record<string, any>, target?: AbstractType): boolean;
    /**
     * Resolves an argument of the given {@code prop}.
     * @param prop argument type
     * @param fields gave field values
     */
    resolve<T>(prop: DBPropertyMetadata<T>, ctx: InvocationContext, args: Record<string, any>, target?: AbstractType): T | null;
}

/**
 * Missing model field execption.
 */
export class MissingModelFieldException extends ArgumentException {
    constructor(fields: DBPropertyMetadata[], type: AbstractType) {
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

const intExp = /^((tiny|small|medium)?int\w*|long)$/;
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

export function toPrimitType(dbtype: string): AbstractType {
    if(dbtype == 'bigint') return BigInt;
    if(strExp.test(dbtype)) return String;
    if(boolExp.test(dbtype)) return Boolean;
    if(dateExp.test(dbtype)) return Date;
    if(intExp.test(dbtype) || floatExp.test(dbtype) || doubleExp.test(dbtype) || decExp.test(dbtype)) {
        return Number;
    }
    return Object;
}

/**
 * missing pipe error.
 * @param prop property metadata.
 * @param type target type.
 * @returns instance of {@link MessageArgumentException}
 */
export function missingPropPipe(prop: DBPropertyMetadata, type?: AbstractType) {
    return new ArgumentException(`missing pipe to transform property ${prop.name} of class ${type}`)
}

const MODEL_FIELD_RESOLVER = new ContextToken<HandlerScope>(() => null!);
export function getTokenResolver(platform: Platform): HandlerScope<DBPropertyMetadata, InvocationContext> {
    let scope = platform.context.get(MODEL_FIELD_RESOLVER);
    if (!scope) {
        scope = createResolveScope(
            platform,
            [
                (input, next, context) => {
                    if (isDefined(input.dbtype)) {
                        switch(input.dbtype) {
                            case 'enum':
                            case 'simple-enum':
                                break;

                            case 'tinyint':
                            case 'smallint':
                            case 'mediumint':
                            case 'int':
                            case 'integer':
                            case 'int2':
                            case 'int4':
                            case 'int8':
                            case 'int32':
                                break;

                            case 'long':
                            case 'int64':
                                break;

                            case 'float':
                            case 'float4':
                            case 'float8':
                            case 'float64':
                            case 'double':
                            case 'smallmoney':
                            case 'money':
                            case 'double precision':
                            case 'decimal':
                            case 'smalldecimal':
                            case 'fixed':
                            case 'dec':
                            case 'real':
                            case 'numeric':
                            case 'number':
                                break;

                            case 'bigint':
                                break;

                            case 'smalldatetime':
                            case 'date':
                            case 'datetime':
                            case 'datetime2':
                            case 'datetimeoffset':
                            case 'timetz':
                            case 'time':
                            case 'time with time zone':
                            case 'time without time zone':
                                break;

                            case 'timestamptz':
                            case 'timestamp':
                            case 'timestamp with time zone':
                            case 'timestamp without time zone':
                            case 'timestamp with local time zone':
                                break;
                            
                            case 'rowversion': //Microsoft SQL Server 中的一种数据类型，用于存储行版本号。
                                // 二进制数据：实际上是 8 字节的二进制数据，但显示为十六进制格式
                                break;

                            case 'bool':
                            case 'boolean':
                            case 'bit':
                            case 'bit varying':
                                break;

                            case 'varbit':
                            case 'tsvector':
                            case 'binary':
                            case 'varbinary':
                            case 'bytes':
                            case 'bytea':
                                break;

                            case 'tinyblob':
                            case 'blob':
                            case 'mediumblob':
                            case 'longblob':                            
                            case 'raw':
                            case 'long raw':
                            case 'bfile':
                            case 'clob':
                            case 'nclob':
                            case 'image':
                                break;

                            case 'uuid':
                            case 'uniqueidentifier': // Microsoft SQL Server 中的一种数据类型，用于存储全局唯一标识符 (GUID - Globally Unique Identifier)。
                                break;

                            case 'hierarchyid': //HierarchyID 是 Microsoft SQL Server 中用于表示层次结构数据的一种特殊数据类型
                                break;

                            case 'sql_variant': //SQL_VARIANT 是一种特殊的数据类型，主要存在于 Microsoft SQL Server 和 Sybase 数据库中。它的设计目的是存储不同数据类型的数据值。
                                break;

                            case 'rowid': //行标识符，用于唯一标识数据库表中的每一行
                            case 'urowid': //行标识符，用于唯一标识数据库表中的每一行
                                //string
                                break;
                            

                            case 'alphanum':
                            case 'character varying':
                            case 'varying character':
                            case 'char varying':
                            case 'nvarchar':
                            case 'national varchar':
                            case 'character':
                            case 'native character':
                            case 'varchar':
                            case 'char':
                            case 'nchar':
                            case 'national char':
                            case 'varchar2':
                            case 'nvarchar2':
                            case 'shorttext':
                            case 'string':
                            case 'tinytext':
                            case 'text':
                            case 'ntext':
                            case 'citext':
                            case 'longtext':
                                break;

                            case 'interval year to month':
                            case 'interval day to second':
                            case 'interval':
                            case 'year':
                            case 'month':
                            case 'day':
                            case 'hour':
                            case 'minute':
                            case 'second':
                                break;
                            
                            case 'set': //'a, b, c'
                            case 'hstore': //'color => "black", storage => "64GB", weight => "150g"'
                                // string
                                break;

                            case 'inet': //IPv4 或 IPv6 地址
                            case 'inet4': //'192.168.1.1/24'
                            case 'inet6': //'2001:db8::1'
                            case 'cidr': //存储 IPv4 或 IPv6 网络地址(带子网掩码)
                            case 'macaddr': //'08:00:2b:01:02:03'
                                // string
                                break;
                            
                            case 'point':
                                // [x, y, z?] number array
                                break;
                                
                            case 'geometry':
                            case 'geography':
                                break;
                            
                            case 'lseg': //'[(1,1), (4,5)]'
                            case 'line': //'{2, 3, -4}'
                            case 'polygon': //'POLYGON((0 0，1 0，1 1，0 1，0 0))'
                            case 'box': //'((1,1), (4,5))'
                            case 'path': // '[(0,0), (1,1), (2,0)]' -- 开放路径（折线）'((0,0), (0,1), (1,1))'; -- 闭合路径（三角形）
                            case 'circle': //'<(0,0),5>'
                            case 'linestring':
                            case 'multipoint':
                            case 'multilinestring':
                            case 'multipolygon':
                            case 'st_point':
                            case 'st_geometry':
                            case 'geometrycollection':
                                //string
                                break;

                            case 'int4range':
                            case 'int8range':
                            case 'numrange':
                            case 'daterange':
                            case 'tsrange':
                            case 'tstzrange':
                            case 'int4multirange':
                            case 'int8multirange':
                            case 'nummultirange':
                            case 'datemultirange':
                            case 'tsmultirange':
                            case 'tstzmultirange':
                                //string
                                break

                            // array（数组类型）
                            // 定义：允许在单个字段中存储多个值的集合
                            // 特点：
                            // 可以是一维或多维数组
                            // 支持各种基本数据类型（整数、文本等）的数组
                            // 提供了丰富的操作函数和运算符
                            case 'simple-array':
                            case 'array': 
                                // Array<T>
                                break;                            
                            

                            case 'cube': //多维立方体类型 '(1,2,3),(4,5,6)'
                                break;

                            case 'ltree': //('Top'), ('Top.Science'), ('Top.Science.Astronomy')
                                //这些特殊数据类型使PostgreSQL能够高效处理特定场景下的数据，超越了传统关系型数据库的功能限制。
                                break;

                            case 'xml':
                                break;

                            case 'json':
                            case 'jsonb':
                            case 'simple-json':
                                break;
                        }
                    }
                    return next(input, context);
                },
           


            ]
        );
        platform.context.set(MODEL_FIELD_RESOLVER, scope);
    }
    return scope;
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
            canResolve: (prop, ctx, args) => prop.dbtype === 'bigint',
            resolve: (prop, ctx, args, target) => {
                const value = args[prop.name] ?? prop.default;
                if (isNil(value)) return null;
                const pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('bigint');
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
        canResolve: (prop, ctx, args) => !prop.multi && isFunction(prop.provider ?? prop.type),
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
 * @returns argument execption {@link MessageArgumentException}.
 */
export function missingPropException(type?: AbstractType) {
    return new ArgumentException(`missing modle properties of class ${type}`)
}

