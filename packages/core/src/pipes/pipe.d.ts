import { ArgumentException, TypeDef } from '@tsdi/ioc';
/**
 * pipe transform insterface.
 *
 * @export
 * @interface PipeTransform
 */
export interface PipeTransform<TReturn = any, T = any> {
    /**
     * transform
     *
     * @param {T} value
     * @param {...any[]} args
     * @returns {TReturn}
     * @memberof PipeTransform
     */
    transform(value: T, ...args: any[]): TReturn;
}
export interface PipeDef<T = any> extends TypeDef<T> {
    selector: string;
}
/**
 * invalid pipe argument error.
 * @param type
 * @param value
 * @param message
 * @returns
 */
export declare function invalidPipeArgument(type: any, value: any, message?: string): ArgumentException;
