/**
 * class type
 * @export
 * @interface Type
 * @extends {Function}
 * @template T
 */
export interface Type<T> extends Function {
    new(...args: any[]): T;
}

/**
 * abstract type
 *
 * @export
 * @interface AbstractType
 * @extends {Function}
 * @template T
 */
export interface AbstractType<T> extends Function {
    new?(...args: any[]): T;
}
