import { ArgumentExecption, StaticProvider, lang } from '@tsdi/ioc';

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
 * invalid pipe argument error.
 * @param type 
 * @param value 
 * @param message 
 * @returns 
 */
export function invalidPipeArgument(type: any, value: any, message?: string) {
    return new ArgumentExecption(`InvalidPipeArgument: '${value}' for pipe '${lang.getClassName(type)}'${message || ''}`)
}

/**
 * pipe service.
 */
export interface PipeService {
    /**
     * use pipes.
     * @param guards 
     */
    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;
}
