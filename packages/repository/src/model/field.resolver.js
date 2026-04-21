"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingModelFieldException = void 0;
exports.missingPropPipe = missingPropPipe;
exports.parseDbtype = parseDbtype;
exports.getModelFieldResolver = getModelFieldResolver;
exports.missingPropException = missingPropException;
exports.toPrimitType = toPrimitType;
const ioc_1 = require("@tsdi/ioc");
/**
 * Missing model field execption.
 */
class MissingModelFieldException extends ioc_1.ArgumentException {
    constructor(fields, type) {
        super(`ailed to resolve model class ${(0, ioc_1.object2string)(type)} because the following required fields were missing: [ ${fields.map(p => (0, ioc_1.object2string)(p)).join(',\n')} ]`);
    }
}
exports.MissingModelFieldException = MissingModelFieldException;
/**
 * missing pipe error.
 * @param prop property metadata.
 * @param type target type.
 * @returns instance of {@link MessageArgumentException}
 */
function missingPropPipe(prop, type) {
    return new ioc_1.ArgumentException(`missing pipe to transform property ${prop.propertyKey} of class ${type}`);
}
function parseDbtype(value, prop, ctx, target) {
    let pipe;
    const args = [];
    switch (prop.dbtype) {
        case 'enum':
        case 'simple-enum':
            pipe = ctx.get('enum');
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
            pipe = ctx.get(prop.dbtype) ?? ctx.get('int');
            break;
        case 'long':
        case 'int64':
            pipe = ctx.get(prop.dbtype) ?? ctx.get('long');
            break;
        case 'float':
        case 'float4':
        case 'float8':
        case 'float64':
            pipe = ctx.get(prop.dbtype) ?? ctx.get('float');
            break;
        case 'double':
        case 'double precision':
        case 'smallmoney':
        case 'money':
        case 'fixed':
            pipe = ctx.get(prop.dbtype) ?? ctx.get('double');
            break;
        case 'decimal':
        case 'smalldecimal':
        case 'dec':
        case 'real':
        case 'numeric':
        case 'number':
            pipe = ctx.get(prop.dbtype) ?? ctx.get('number');
            break;
        case 'bigint':
            pipe = ctx.get('bigint');
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
            pipe = ctx.get(prop.dbtype) ?? ctx.get('date');
            break;
        case 'timestamptz':
        case 'timestamp':
        case 'timestamp with time zone':
        case 'timestamp without time zone':
        case 'timestamp with local time zone':
            pipe = ctx.get(prop.dbtype) ?? ctx.get('int');
            break;
        case 'rowversion': //Microsoft SQL Server 中的一种数据类型，用于存储行版本号。
            // 二进制数据：实际上是 8 字节的二进制数据，但显示为十六进制格式。
            pipe = ctx.get(prop.dbtype) ?? ctx.get('string');
            break;
        case 'bool':
        case 'boolean':
        case 'bit':
        case 'bit varying':
            pipe = ctx.get(prop.dbtype) ?? ctx.get('boolean');
            break;
        case 'varbit':
        case 'tsvector':
        case 'binary':
        case 'varbinary':
        case 'bytes':
        case 'bytea':
            pipe = ctx.get(prop.dbtype) ?? ctx.get('buffer');
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
            pipe = ctx.get(prop.dbtype) ?? ctx.get('blob');
            args.push(prop.length);
            break;
        case 'uuid':
        case 'uniqueidentifier': // Microsoft SQL Server 中的一种数据类型，用于存储全局唯一标识符 (GUID - Globally Unique Identifier)。
            pipe = ctx.get('string');
            break;
        case 'hierarchyid': //HierarchyID 是 Microsoft SQL Server 中用于表示层次结构数据的一种特殊数据类型
            pipe = ctx.get('string');
            break;
        case 'sql_variant': //SQL_VARIANT 是一种特殊的数据类型，主要存在于 Microsoft SQL Server 和 Sybase 数据库中。它的设计目的是存储不同数据类型的数据值。
            pipe = ctx.get('string');
            break;
        case 'rowid': //行标识符，用于唯一标识数据库表中的每一行
        case 'urowid': //行标识符，用于唯一标识数据库表中的每一行
            pipe = ctx.get('string');
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
            pipe = ctx.get('string');
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
            pipe = ctx.get('string');
            break;
        case 'set': //'a, b, c'
        case 'hstore': //'color => "black", storage => "64GB", weight => "150g"'
            // string
            pipe = ctx.get(prop.dbtype) ?? ctx.get('string');
            args.push(prop.length);
            break;
        case 'inet': //IPv4 或 IPv6 地址
        case 'inet4': //'192.168.1.1/24'
        case 'inet6': //'2001:db8::1'
        case 'cidr': //存储 IPv4 或 IPv6 网络地址(带子网掩码)
        case 'macaddr': //'08:00:2b:01:02:03'
            // string
            pipe = ctx.get(prop.dbtype) ?? ctx.get('string');
            args.push(prop.length);
            break;
        case 'point':
            // [x, y, z?] number array
            pipe = ctx.get(prop.dbtype) ?? ctx.get('array');
            args.push('number');
            args.push(3);
            break;
        case 'geometry':
        case 'geography':
            pipe = ctx.get(prop.dbtype) ?? ctx.get('array');
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
            pipe = ctx.get(prop.dbtype) ?? ctx.get('string');
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
            pipe = ctx.get(prop.dbtype) ?? ctx.get('string');
            args.push(prop.length);
            break;
        // array（数组类型）
        // 定义：允许在单个字段中存储多个值的集合
        // 特点：
        // 可以是一维或多维数组
        // 支持各种基本数据类型（整数、文本等）的数组
        // 提供了丰富的操作函数和运算符
        case 'simple-array':
        case 'array':
            // Array<T>
            pipe = ctx.get(prop.dbtype) ?? ctx.get('array');
            if (prop.type && prop.type !== Array)
                args.push(prop.type);
            break;
        case 'cube': //多维立方体类型 '(1,2,3),(4,5,6)'
            pipe = ctx.get(prop.dbtype) ?? ctx.get('string');
            args.push(prop.length);
            break;
        case 'ltree': //('Top'), ('Top.Science'), ('Top.Science.Astronomy')
            //这些特殊数据类型使PostgreSQL能够高效处理特定场景下的数据，超越了传统关系型数据库的功能限制。
            pipe = ctx.get(prop.dbtype) ?? ctx.get('string');
            args.push(prop.length);
            break;
        case 'xml':
            pipe = ctx.get(prop.dbtype) ?? ctx.get('string');
            args.push(prop.length);
            break;
        case 'json':
        case 'jsonb':
        case 'simple-json':
            pipe = ctx.get('json');
            args.push(prop.length);
            break;
    }
    if (!pipe)
        throw missingPropPipe(prop, target);
    return pipe.transform(value, ...args);
}
const MODEL_FIELD_RESOLVER = new ioc_1.ContextToken(() => null);
function getModelFieldResolver(runtime) {
    let scope = runtime.get(MODEL_FIELD_RESOLVER);
    if (!scope) {
        scope = (0, ioc_1.createResolveHandler)([
            (input, next, context) => {
                if (input[0].dbtype) {
                    const [prop, args, target] = input;
                    const value = args[prop.propertyKey] ?? prop.default;
                    if ((0, ioc_1.isNil)(value))
                        return null;
                    return parseDbtype(value, prop, context, target ?? (0, ioc_1.getType)(args));
                }
                return next(input, context);
            },
            (input, next, context) => {
                const [prop, args, target] = input;
                if (!prop.multi) {
                    const value = args[prop.propertyKey] ?? prop.default;
                    if ((0, ioc_1.isNil)(value))
                        return null;
                    const type = prop.provider ?? prop.type;
                    if ((0, ioc_1.isFunction)(type)) {
                        const pipe = context.get(type.name.toLowerCase());
                        if (!pipe)
                            throw missingPropPipe(prop, target);
                        return pipe.transform(value);
                    }
                }
                return next(input, context);
            },
        ]);
        runtime.set(MODEL_FIELD_RESOLVER, scope);
    }
    return scope;
}
/**
 * missing property execption.
 * @param type
 * @returns argument execption {@link MessageArgumentException}.
 */
function missingPropException(type) {
    return new ioc_1.ArgumentException(`missing modle properties of class ${type}`);
}
function toPrimitType(dbtype) {
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
            return Buffer;
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
//# sourceMappingURL=field.resolver.js.map