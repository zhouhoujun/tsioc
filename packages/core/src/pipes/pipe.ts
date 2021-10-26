import { isArray, lang } from '@tsdi/ioc';

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

/**
 * argument errror.
 */
 export class ArgumentError extends Error {
    constructor(message?: string | string[]) {
        super();
        this.message = isArray(message) ? message.join('\n') : message || '';
        Error.captureStackTrace(this);
    }
}

export function invalidPipeArgumentError(type: any, value: Object, message?: string) {
    return new ArgumentError(`InvalidPipeArgument: '${value}' for pipe '${lang.getClassName(type)}'${message}`);
}

