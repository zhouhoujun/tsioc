import { ClassType } from '@tsdi/ioc';
import { LoadType, IContainer, ICoreInjector } from '@tsdi/core';
import { IBootContext, BootOption } from './Context';


/**
 * boot application hooks.
 *
 * @export
 * @interface ContextInit
 */
export interface ContextInit<T extends IBootContext = IBootContext> {
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
export interface IBootApplication<T extends IBootContext = IBootContext> extends ContextInit<T> {

    /**
     * boot target.
     *
     * @type {(ClassType | BootOption | T)}
     * @memberof IBootApplication
     */
    target?: ClassType | BootOption | T;

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
     * get container of application.
     *
     * @returns {IContainerPool}
     * @memberof IBootApplication
     */
    getContainer(): IContainer;

    /**
     * get root injector.
     */
    getRootInjector(): ICoreInjector;

}
