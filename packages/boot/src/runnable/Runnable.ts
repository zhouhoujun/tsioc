import { lang, Type, Abstract } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BootContext } from '../BootContext';




/**
 * runable interface. define the type as runable.
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
    getContainer(): IContainer;

    /**
     * runable context.
     *
     * @type {BootContext}
     * @memberof IRunnable
     */
    readonly context?: BootContext;

    /**
     * get boot instance.
     *
     * @type {T}
     * @memberof IBoot
     */
    getBoot(): T;

    /**
     * get boot type.
     *
     * @returns {Type<T>}
     * @memberof IBoot
     */
    getBootType(): Type<T>;

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
 * runnablle on init hooks
 *
 * @export
 * @interface RunnableInit
 */
export interface RunnableInit {
    /**
     * on init hooks.
     *
     * @returns {(void | Promise<void>)}
     */
    onInit(): void | Promise<void>;
}

/**
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
@Abstract()
export abstract class Runnable<T = any> implements IRunnable<T> {

    protected _ctx: BootContext;
    get context(): BootContext {
        return this._ctx;
    }

    constructor(ctx: BootContext) {
        this._ctx = ctx;
    }

    getContainer(): IContainer {
        return this.context.getRaiseContainer();
    }

    getBoot(): T {
        return this.context.getBootTarget();
    }


    getBootType(): Type<T> {
        return lang.getClass(this.getBoot());
    }

    /**
     * run application via boot instance.
     *
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof IRunner
     */
    abstract run(data?: any): Promise<any>;

}

/**
 * target is Runnable or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Runnable<any>}
 */
export function isRunnable<T>(target: any): target is Runnable<T> {
    if (target instanceof Runnable) {
        return true;
    }
    return false;
}
