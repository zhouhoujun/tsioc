
import { Token, lang, IContainer, Inject, ContainerToken } from '@ts-ioc/core';
import { ModuleConfigure, BootOptions } from '../modules';

/**
 * boot.
 *
 * @export
 * @interface IBoot
 * @template T
 */
export interface IRunnable<T> {
    /**
     * container.
     *
     * @type {IContainer}
     * @memberof IBoot
     */
    container: IContainer;
    /**
     * target instance.
     *
     * @type {T}
     * @memberof IBoot
     */
    getTarget(): T;

    /**
     * get target token.
     *
     * @returns {Token<T>}
     * @memberof IBoot
     */
    getTargetToken(): Token<T>;

    /**
     * on boot init.
     *
     * @param {BootOptions<T>} options
     * @returns {Promise<void>}
     * @memberof IBoot
     */
    onInit?(options: BootOptions<T>): Promise<void>;

}

/**
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
export class RunnableBase<T> implements IRunnable<T> {

    @Inject(ContainerToken)
    container: IContainer;

    constructor(protected token?: Token<T>, protected instance?: T, protected config?: ModuleConfigure) {

    }

    getTarget(): T {
        return this.instance;
    }

    getTargetToken(): Token<T> {
        return this.token || lang.getClass(this.instance);
    }

}

/**
 * target is Runnable or not.
 *
 * @export
 * @param {*} target
 * @returns {target is RunnableBase<any>}
 */
export function isRunnable(target: any): target is RunnableBase<any> {
    if (target instanceof RunnableBase) {
        return true;
    }
    return false;
}
