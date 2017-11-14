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
