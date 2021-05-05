import { ClassType, IContainer, Destroyable, IInjector, LoadType } from '@tsdi/ioc';
import { IBootContext, BootOption } from './Context';


/**
 * boot application interface.
 *
 * @export
 * @interface IBootApplication
 * @extends {ContextInit<T>}
 * @template T
 */
export interface IBootApplication<T extends IBootContext = IBootContext> extends Destroyable {

    /**
     * boot target.
     *
     * @type {(ClassType | BootOption | T)}
     */
    target?: ClassType | BootOption | T;

    /**
     * get boot application context.
     *
     * @returns {T}
     */
    getContext(): T;

    /**
     * run application
     *
     * @param {(LoadType[] | LoadType | string)} [deps]
     * @param {...string[]} args
     * @returns {Promise<T>}
     */
    run(deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<T>;

    /**
     * get container of application.
     *
     * @returns {IContainerPool}
     */
    getContainer(): IContainer;

    /**
     * get root injector.
     */
    getRootInjector(): IInjector;

    /**
     * bootstrap.
     * @param target 
     */
    bootstrap<T>(target: ClassType<T> | BootOption<T>): Promise<any>;

}
