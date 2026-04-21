import { PropertyMetadata, AbstractType, ArgumentException, Type, RuntimeHandler, Runtime, InterceptorLike, RunContext } from '@tsdi/ioc';
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
export declare class MissingModelFieldException extends ArgumentException {
    constructor(fields: DBPropertyMetadata[], type: AbstractType);
}
/**
 * missing pipe error.
 * @param prop property metadata.
 * @param type target type.
 * @returns instance of {@link MessageArgumentException}
 */
export declare function missingPropPipe(prop: DBPropertyMetadata, type?: Type): ArgumentException;
export declare function parseDbtype(value: any, prop: DBPropertyMetadata, ctx: RunContext, target: Type): any;
export declare function getModelFieldResolver(runtime: Runtime): RuntimeHandler<[DBPropertyMetadata, any, Type], any, RunContext>;
export type ModelFieldResolver = RuntimeHandler<[DBPropertyMetadata, any, Type], any, RunContext>;
export type FieldResolveInterceptor = InterceptorLike<[DBPropertyMetadata, any, Type], any, RunContext>;
/**
 * missing property execption.
 * @param type
 * @returns argument execption {@link MessageArgumentException}.
 */
export declare function missingPropException(type?: AbstractType): ArgumentException;
export declare function toPrimitType(dbtype: string): AbstractType;
