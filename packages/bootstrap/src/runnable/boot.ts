import { Token, lang, IContainer, Inject, ContainerToken } from '@ts-ioc/core';
import { ModuleConfigure, BootOptions } from '../modules';

/**
 * boot.
 *
 * @export
 * @interface IBoot
 * @template T
 */
export interface IBoot<T> {
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
    getTarget?(): T;

    /**
     * get target token.
     *
     * @returns {Token<T>}
     * @memberof IBoot
     */
    getTargetToken?(): Token<T>;

    /**
     * on boot init.
     *
     * @param {BootOptions<T>} options
     * @returns {Promise<void>}
     * @memberof IBoot
     */
    onInit(options: BootOptions<T>): Promise<void>;

}

/**
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
export class Boot<T> implements IBoot<T> {

    @Inject(ContainerToken)
    container: IContainer;

    constructor(protected token?: Token<T>, protected instance?: T, protected config?: ModuleConfigure) {

    }

    async onInit(options: BootOptions<T>) {
    
    }

    getTarget?(): T {
        return this.instance;
    }

    getTargetToken?(): Token<T> {
        return this.token || lang.getClass(this.instance);
    }

}

/**
 * target is boot.
 *
 * @export
 * @param {*} target
 * @returns {target is Boot<any>}
 */
export function isBoot(target: any): target is Boot<any> {
    if (target instanceof Boot) {
        return true;
    }
    return false;
}