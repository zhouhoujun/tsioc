import { LoadType, Type } from '@tsdi/ioc';
import { IContainerPool } from './core';
import { BootContext, BootOption } from './BootContext';


/**
 * boot application hooks.
 *
 * @export
 * @interface ContextInit
 */
export interface ContextInit<T extends BootContext = BootContext> {
    /**
     * on context init.
     *
     * @param {T} ctx
     * @memberof ContextInit
     */
    onContextInit(ctx: T);
}

/**
 * boot application interface.
 *
 * @export
 * @interface IBootApplication
 * @extends {ContextInit<T>}
 * @template T
 */
export interface IBootApplication<T extends BootContext = BootContext> extends ContextInit<T> {

    /**
     * boot target.
     *
     * @type {(Type | BootOption | T)}
     * @memberof IBootApplication
     */
    target?: Type | BootOption | T;

    /**
     * get boot application context.
     *
     * @returns {T}
     * @memberof IBootApplication
     */
    getContext(): T;

    /**
     * run application
     *
     * @param {(LoadType[] | LoadType | string)} [deps]
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof IBootApplication
     */
    run(deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<T>;

    /**
     * get container pools of application.
     *
     * @returns {IContainerPool}
     * @memberof IBootApplication
     */
    getPools(): IContainerPool;

}
