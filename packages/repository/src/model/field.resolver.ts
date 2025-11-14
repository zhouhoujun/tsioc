import { isFunction, isNil, PropertyMetadata, AbstractType, object2string, ArgumentException, Type, ContextToken, RuntimeHandler, Runtime, createResolveHandler, Interceptor, InterceptorLike, getType, ResolveContext } from '@tsdi/ioc';
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
    propertyKey: string;
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
 * Missing model field execption.
 */
export class MissingModelFieldException extends ArgumentException {
    constructor(fields: DBPropertyMetadata[], type: AbstractType) {
        super(`ailed to resolve model class ${object2string(type)} because the following required fields were missing: [ ${fields.map(p => object2string(p)).join(',\n')} ]`)
    }
}



/**
 * missing pipe error.
 * @param prop property metadata.
 * @param type target type.
 * @returns instance of {@link MessageArgumentException}
 */
export function missingPropPipe(prop: DBPropertyMetadata, type?: Type) {
    return new ArgumentException(`missing pipe to transform property ${prop.propertyKey} of class ${type}`)
}

export function parseDbtype(value: any, prop: DBPropertyMetadata, ctx: ResolveContext, target: Type) {
    let pipe: PipeTransform | undefined;

    const args = [];
    switch (prop.dbtype) {
        case 'enum':
        case 'simple-enum':
            pipe = ctx.get<PipeTransform>('enum');
            args.push(prop.enum);
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
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('int');
            break;

        case 'long':
        case 'int64':
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('long');
            break;

        case 'float':
        case 'float4':
        case 'float8':
        case 'float64':
            pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('float');
            break;

        case 'double':
        case 'double precision':
        case 'smallmoney':
        case 'money':
        case 'fixed':
            pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('double');
            break;

        case 'decimal':
        case 'smalldecimal':
        case 'dec':
        case 'real':
        case 'numeric':
        case 'number':
            pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('number');
            break;

        case 'bigint':
            pipe = ctx.get<PipeTransform>('bigint');
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
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('date');
            break;

        case 'timestamptz':
        case 'timestamp':
        case 'timestamp with time zone':
        case 'timestamp without time zone':
        case 'timestamp with local time zone':
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('int');
            break;

        case 'rowversion': //Microsoft SQL Server 中的一种数据类型，用于存储行版本号。
            // 二进制数据：实际上是 8 字节的二进制数据，但显示为十六进制格式。
            pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('string');
            break;

        case 'bool':
        case 'boolean':
        case 'bit':
        case 'bit varying':
            pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('boolean');
            break;

        case 'varbit':
        case 'tsvector':
        case 'binary':
        case 'varbinary':
        case 'bytes':
        case 'bytea':
            pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('buffer');
            args.push(prop.length);
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
            pipe = ctx.get<PipeTransform>(prop.dbtype!) ?? ctx.get<PipeTransform>('blob');
            args.push(prop.length);
            break;

        case 'uuid':
        case 'uniqueidentifier': // Microsoft SQL Server 中的一种数据类型，用于存储全局唯一标识符 (GUID - Globally Unique Identifier)。
            pipe = ctx.get<PipeTransform>('string');
            break;

        case 'hierarchyid': //HierarchyID 是 Microsoft SQL Server 中用于表示层次结构数据的一种特殊数据类型
            pipe = ctx.get<PipeTransform>('string');
            break;

        case 'sql_variant': //SQL_VARIANT 是一种特殊的数据类型，主要存在于 Microsoft SQL Server 和 Sybase 数据库中。它的设计目的是存储不同数据类型的数据值。
            pipe = ctx.get<PipeTransform>('string');
            break;

        case 'rowid': //行标识符，用于唯一标识数据库表中的每一行
        case 'urowid': //行标识符，用于唯一标识数据库表中的每一行
            pipe = ctx.get<PipeTransform>('string');
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
            pipe = ctx.get<PipeTransform>('string');
            args.push(prop.length);
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
            pipe = ctx.get<PipeTransform>('string');
            break;

        case 'set': //'a, b, c'
        case 'hstore': //'color => "black", storage => "64GB", weight => "150g"'
            // string
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('string');
            args.push(prop.length);
            break;

        case 'inet': //IPv4 或 IPv6 地址
        case 'inet4': //'192.168.1.1/24'
        case 'inet6': //'2001:db8::1'
        case 'cidr': //存储 IPv4 或 IPv6 网络地址(带子网掩码)
        case 'macaddr': //'08:00:2b:01:02:03'
            // string
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('string');
            args.push(prop.length);
            break;

        case 'point':
            // [x, y, z?] number array
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('array');
            args.push('number');
            args.push(3);
            break;

        case 'geometry':
        case 'geography':
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('array');
            args.push('number');
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
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('string');
            args.push(prop.length);
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
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('string');
            args.push(prop.length);
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
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('array');
            if (prop.type && prop.type !== Array) args.push(prop.type);
            break;


        case 'cube': //多维立方体类型 '(1,2,3),(4,5,6)'
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('string');
            args.push(prop.length);
            break;

        case 'ltree': //('Top'), ('Top.Science'), ('Top.Science.Astronomy')
            //这些特殊数据类型使PostgreSQL能够高效处理特定场景下的数据，超越了传统关系型数据库的功能限制。
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('string');
            args.push(prop.length);
            break;

        case 'xml':
            pipe = ctx.get<PipeTransform>(prop.dbtype) ?? ctx.get<PipeTransform>('string');
            args.push(prop.length);
            break;

        case 'json':
        case 'jsonb':
        case 'simple-json':
            pipe = ctx.get<PipeTransform>('json');
            args.push(prop.length);
            break;
    }
    if (!pipe) throw missingPropPipe(prop, target);
    return pipe.transform(value, ...args);
}

const MODEL_FIELD_RESOLVER = new ContextToken<RuntimeHandler<[DBPropertyMetadata, any, Type], ResolveContext>>(() => null!);
export function getModelFieldResolver(runtime: Runtime): RuntimeHandler<[DBPropertyMetadata, any, Type], ResolveContext> {
    let scope = runtime.get(MODEL_FIELD_RESOLVER);
    if (!scope) {
        scope = createResolveHandler(
            [
                (input, next, context) => {
                    if (input[0].dbtype) {
                        const [prop, args, target] = input;
                        const value = args[prop.propertyKey] ?? prop.default;
                        if (isNil(value)) return null;
                        return parseDbtype(value, prop, context, target ?? getType(args));
                    }
                    return next(input, context);
                },
                (input, next, context) => {
                    const [prop, args, target] = input;
                    if (!prop.multi) {
                        const value = args[prop.propertyKey] ?? prop.default;
                        if (isNil(value)) return null;
                        const type = prop.provider ?? prop.type;
                        if (isFunction(type)) {
                            const pipe = context.get<PipeTransform>(type.name.toLowerCase());
                            if (!pipe) throw missingPropPipe(prop, target);
                            return pipe.transform(value)
                        }
                    }
                    return next(input, context);
                },

            ]
        );
        runtime.set(MODEL_FIELD_RESOLVER, scope);
    }
    return scope;
}

export type ModelFieldResolver = RuntimeHandler<[DBPropertyMetadata, any, Type], ResolveContext>;
export type FieldResolveInterceptor = InterceptorLike<[DBPropertyMetadata, any, Type], any, ResolveContext>;

/**
 * missing property execption. 
 * @param type 
 * @returns argument execption {@link MessageArgumentException}.
 */
export function missingPropException(type?: AbstractType) {
    return new ArgumentException(`missing modle properties of class ${type}`)
}


export function toPrimitType(dbtype: string): AbstractType {

    switch (dbtype) {
        // case 'enum':
        // case 'simple-enum':
        //     pipe = ctx.get<PipeTransform>('enum');
        //     args.push(prop.enum);
        //     break;

        case 'tinyint':
        case 'smallint':
        case 'mediumint':
        case 'int':
        case 'integer':
        case 'int2':
        case 'int4':
        case 'int8':
        case 'int32':
            return Number;

        case 'long':
        case 'int64':
            return Number;

        case 'float':
        case 'float4':
        case 'float8':
        case 'float64':
            return Number;

        case 'double':
        case 'double precision':
        case 'smallmoney':
        case 'money':
        case 'fixed':
            return Number;

        case 'decimal':
        case 'smalldecimal':
        case 'dec':
        case 'real':
        case 'numeric':
        case 'number':
            return Number;

        case 'bigint':
            return BigInt;

        case 'smalldatetime':
        case 'date':
        case 'datetime':
        case 'datetime2':
        case 'datetimeoffset':
        case 'timetz':
        case 'time':
        case 'time with time zone':
        case 'time without time zone':
            return Date;

        case 'timestamptz':
        case 'timestamp':
        case 'timestamp with time zone':
        case 'timestamp without time zone':
        case 'timestamp with local time zone':
            return Number;

        case 'rowversion': //Microsoft SQL Server 中的一种数据类型，用于存储行版本号。
            // 二进制数据：实际上是 8 字节的二进制数据，但显示为十六进制格式。
            return Buffer

        case 'bool':
        case 'boolean':
        case 'bit':
        case 'bit varying':
            return Boolean;

        case 'varbit':
        case 'tsvector':
        case 'binary':
        case 'varbinary':
        case 'bytes':
        case 'bytea':
            return Buffer;

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
            return Blob;

        case 'uuid':
        case 'uniqueidentifier': // Microsoft SQL Server 中的一种数据类型，用于存储全局唯一标识符 (GUID - Globally Unique Identifier)。
            return String;

        case 'hierarchyid': //HierarchyID 是 Microsoft SQL Server 中用于表示层次结构数据的一种特殊数据类型
            return String;

        case 'sql_variant': //SQL_VARIANT 是一种特殊的数据类型，主要存在于 Microsoft SQL Server 和 Sybase 数据库中。它的设计目的是存储不同数据类型的数据值。
            return String;

        case 'rowid': //行标识符，用于唯一标识数据库表中的每一行
        case 'urowid': //行标识符，用于唯一标识数据库表中的每一行
            return String;


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
            return String;

        case 'interval year to month':
        case 'interval day to second':
        case 'interval':
        case 'year':
        case 'month':
        case 'day':
        case 'hour':
        case 'minute':
        case 'second':
            return String;

        case 'set': //'a, b, c'
        case 'hstore': //'color => "black", storage => "64GB", weight => "150g"'
            // string
            return String;

        case 'inet': //IPv4 或 IPv6 地址
        case 'inet4': //'192.168.1.1/24'
        case 'inet6': //'2001:db8::1'
        case 'cidr': //存储 IPv4 或 IPv6 网络地址(带子网掩码)
        case 'macaddr': //'08:00:2b:01:02:03'
            return String;

        case 'point':
            // [x, y, z?] number array
            return Array;

        case 'geometry':
        case 'geography':
            return String;

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
            return String;

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
            return String;

        // array（数组类型）
        // 定义：允许在单个字段中存储多个值的集合
        // 特点：
        // 可以是一维或多维数组
        // 支持各种基本数据类型（整数、文本等）的数组
        // 提供了丰富的操作函数和运算符
        case 'simple-array':
        case 'array':
            // Array<T>
            return Array;


        case 'cube': //多维立方体类型 '(1,2,3),(4,5,6)'
            return String;

        case 'ltree': //('Top'), ('Top.Science'), ('Top.Science.Astronomy')
            //这些特殊数据类型使PostgreSQL能够高效处理特定场景下的数据，超越了传统关系型数据库的功能限制。
            return String;

        case 'xml':
            return String;

        case 'json':
        case 'jsonb':
        case 'simple-json':
            return Object;
    }
    return Object;
}
