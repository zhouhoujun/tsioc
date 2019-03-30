import { Token, lang, Inject, Type, Abstract } from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
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
    container: IContainer;

    /**
     * runable context.
     *
     * @type {BootContext}
     * @memberof IRunnable
     */
    readonly ctx?: BootContext;

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
     * @param {BootContext} ctx
     * @returns {Promise<void>}
     * @memberof IRunnable
     */
    onInit(ctx: BootContext): Promise<void>;


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
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
@Abstract()
export abstract class Runnable<T> implements IRunnable<any> {

    @Inject(ContainerToken)
    container: IContainer;

    private _ctx: BootContext;
    get ctx(): BootContext {
        return this._ctx;
    }

    constructor(ctx: BootContext) {
        this._ctx = ctx;
    }

    async onInit(): Promise<void> {

    }

    getTarget(): T {
        return this.ctx.bootstrap || this.ctx.target;
    }


    getTargetType(): Type<T> {
        return this.ctx.type || lang.getClass(this.getTarget());
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
