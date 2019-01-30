
import { Token, lang, IContainer, Inject, ContainerToken, InjectToken, Type } from '@ts-ioc/core';
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
    /**
     * module token
     *
     * @type {Token<any>}
     * @memberof RunnableOptions
     */
    mdToken?: Token<any>;
    /**
     * bootstrap type.
     *
     * @type {Type<T>}
     * @memberof RunnableOptions
     */
    type: Type<T>;
    /**
     * bootstrap instance.
     *
     * @type {T}
     * @memberof RunnableOptions
     */
    instance: T;
    /**
     * bootstrap configure.
     *
     * @type {ModuleConfigure}
     * @memberof RunnableOptions
     */
    config: ModuleConfigure;

    /**
     *  custom boot data of `BuildOptions`
     *
     * @type {*}
     * @memberof RunnableOptions
     */
    data?: any;
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
