import { Token, isFunction } from '@ts-ioc/core';
import { ModuleConfigure } from '../modules';

/**
 * application runer.
 *
 * @export
 * @interface IRunner
 * @template T
 */
export interface IRunner<T> {
    /**
     * target instance.
     *
     * @type {T}
     * @memberof IRunner
     */
    getTarget?(): T;

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
export abstract class Runner<T> implements IRunner<T> {

    constructor(protected token?: Token<T>, protected instance?: T, protected config?: ModuleConfigure) {

    }

    getTarget?(): T {
        return this.instance;
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
 * boot element
 *
 * @export
 * @class Boot
 * @extends {Runner<any>}
 */
export abstract class Boot extends Runner<any> {
    constructor(protected token?: Token<any>, protected instance?: any, protected config?: ModuleConfigure) {
        super(token, instance, config);
    }
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
