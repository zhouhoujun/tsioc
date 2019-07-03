import { IocCoreService, Type, ProviderTypes, InjectToken } from '@tsdi/ioc';
import { BootContext, BootOption } from '../BootContext';
import { IContainer } from '@tsdi/core';
import { IBootApplication } from '../IBootApplication';
import { IModuleResolveOption } from './resovers';
import { IStartup } from '../runnable';

export interface BootSubAppOption<T extends BootContext> {
    /**
     * sub context init.
     *
     * @memberof SubAppBootOption
     */
    contextInit?: (ctx: T) => void;

    /**
     * custom reg current app exports to parent.
     *
     * @memberof SubAppBootOption
     */
    regExports?: (ctx: T, parent: IContainer) => void;
}

/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 * @extends {IocCoreService}
 */
export interface IBuilderService extends IocCoreService {
    /**
     * resolve binding module.
     *
     * @template T
     * @param {Type} target
     * @param {IModuleResolveOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    resolve<T>(target: Type<T>, options: IModuleResolveOption, ...providers: ProviderTypes[]): Promise<T>;
    /**
     * create module.
     *
     * @template T
     * @param {(target: Type<T> | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<any>}
     * @memberof BuilderService
     */
    buildTarget<T>(target: Type<T> | BootOption | BootContext, ...args: string[]): Promise<T>;
    /**
     * build bootstrap target instance.
     *
     * @param {(Type | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<any>}
     * @memberof IBuilderService
     */
    buildBootTarget(target: Type | BootOption | BootContext, ...args: string[]): Promise<any>;
    /**
     * build module.
     *
     * @template T
     * @param {(Type | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    build<T extends BootContext>(target: Type | BootOption | T, ...args: string[]): Promise<T>;

    /**
     * create runnable.
     *
     * @template T
     * @param {(Type | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<IStartup<T>>}
     * @memberof BuilderService
     */
    buildRunnable<T>(target: Type | BootOption | BootContext, ...args: string[]): Promise<IStartup<T>>;
    /**
     * run module.
     *
     * @template T
     * @param {(Type | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof RunnerService
     */
    run<T extends BootContext>(target: Type | BootOption | T, ...args: string[]): Promise<T>;
    /**
     * boot application.
     *
     * @template T
     * @param {(Type | BootOption | T)} target
     * @param {((ctx: T) => void |BootSubAppOption<T> | string)} [options]
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof IBuilderService
     */
    boot<T extends BootContext>(target: Type | BootOption | T, options?: (ctx: T) => void | BootSubAppOption<T> | string, ...args: string[]): Promise<T>;
    /**
     * boot application.
     *
     * @template T
     * @param {(Type | BootOption | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    bootApp(application: IBootApplication, ...args: string[]): Promise<BootContext>;
}


export const BuilderServiceToken = new InjectToken<IBuilderService>('BOOT_BuilderService');
