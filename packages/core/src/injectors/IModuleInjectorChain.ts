import { InjectToken } from '../InjectToken';
import { IContainer } from '../IContainer';
import { Type } from '../types';
import { IModuleInjector } from './IModuleInjector';

/**
 * module Injector chian interface.
 *
 * @export
 * @interface IModuleInjectorChain
 */
export interface IModuleInjectorChain {
    /**
     * injector chain.
     *
     * @type {IModuleInjector[]}
     * @memberof IModuleInjectorChain
     */
    readonly injectors: IModuleInjector[];

    /**
     * set first step.
     *
     * @param {IModuleInjector} injector
     * @memberof IModuleInjectorChain
     */
    first(injector: IModuleInjector): this;

    /**
     * set next step.
     *
     * @param {IModuleInjector} injector
     * @memberof IModuleInjectorChain
     */
    next(injector: IModuleInjector): this;

    /**
     * inject module via injector chain.
     *
     * @param {IContainer} container
     * @param {Type<any>[]} modules
     * @returns {Promise(Type<any>[]>}
     * @memberof IModuleInjectorChain
     */
    inject(container: IContainer, modules: Type<any>[]): Promise<Type<any>[]>;

    /**
     * sync inject module.
     *
     * @param {IContainer} container
     * @param {Type<any>[]} modules
     * @returns {Type<any>[]}
     * @memberof IModuleInjectorChain
     */
    syncInject(container: IContainer, modules: Type<any>[]): Type<any>[];
}


/**
 * module fileter token. mast use as singlton.
 */
export const ModuleInjectorChainToken = new InjectToken<IModuleInjectorChain>('DI_ModuleInjectorChain');
