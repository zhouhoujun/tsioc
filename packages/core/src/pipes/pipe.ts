import { ArgumentError, lang } from '@tsdi/ioc';

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
     * @memberof IPipeTransform
     */
    transform(value: T, ...args: any[]): TReturn;
}


export function invalidPipeArgumentError(type: any, value: Object, message?: string) {
    return new ArgumentError(`InvalidPipeArgument: '${value}' for pipe '${lang.getClassName(type)}'${message}`);
}

