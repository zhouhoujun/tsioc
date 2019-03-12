import { isFunction } from '@ts-ioc/ioc';
import { IRunnable, Runnable, RunnableOptions } from './Runnable';

/**
 * application runer.
 *
 * @export
 * @interface IRunner
 * @template T
 */
export interface IRunner<T> extends IRunnable<T> {

    /**
     * run application via boot instance.
     *
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof IRunner
     */
    run(data?: any): Promise<any>;
}



/**
 * boot element.
 *
 * @export
 * @abstract
 * @class Boot
 * @implements {IBoot}
 */
export abstract class Runner<T> extends Runnable<T> implements IRunner<T> {

    constructor(options?: RunnableOptions<T>) {
        super(options);
    }

    /**
     * run boot.
     *
     * @abstract
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof Runner
     */
    abstract run(data?: any): Promise<any>;
}



/**
 * target is runner or not.
 *
 * @export
 * @param {*} target
 * @returns {target is IRunner<any>}
 */
export function isRunner(target: any): target is IRunner<any> {
    if (target instanceof Runner) {
        return true;
    }
    if (target && isFunction(target.run)) {
        return true;
    }
    return false;
}
