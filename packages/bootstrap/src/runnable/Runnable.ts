
import { Token, lang, IContainer, Inject, ContainerToken, InjectToken, Type } from '@ts-ioc/core';
import { ModuleConfigure, BootOptions } from '../modules';
import { any } from 'expect';

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
    getTargetType(): Token<T>;

    /**
     * on boot init.
     *
     * @param {BootOptions<T>} options
     * @returns {Promise<void>}
     * @memberof IBoot
     */
    onInit?(options: BootOptions<T>): Promise<void>;

}

export interface RunnableOptions<T> {
    mdToken?: Token<any>;
    type: Type<T>;
    instance: T;
    config: ModuleConfigure;
}

/**
 * runnable options token.
 */
export const RunnableOptionsToken = new InjectToken<RunnableOptions<any>>('boot_runnable_options');

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

    constructor(@Inject(RunnableOptionsToken) protected options: RunnableOptions<T>) {

    }

    getTarget(): T {
        return this.options.instance;
    }

    getModuleToken(): Token<any> {
        return this.options.mdToken;
    }

    getTargetType(): Type<T> {
        return this.options.type || lang.getClass(this.options.instance);
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
