import { IocCoreService, Type, ProviderTypes, InjectToken } from '@tsdi/ioc';
import { BootContext, BootOption } from '../BootContext';
import { IContainer } from '@tsdi/core';
import { IBootApplication } from '../IBootApplication';
import { IModuleResolveOption } from './resovers';
import { IRunnable } from '../runnable';

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
     * @param {Type<any>} target
     * @param {IModuleResolveOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    resolve<T>(target: Type<any>, options: IModuleResolveOption, ...providers: ProviderTypes[]): Promise<T>;
    /**
     * create module.
     *
     * @template T
     * @param {(Type<any> | BootOption | T)} target
     * @param {...string[]} args
     * @returns {Promise<any>}
     * @memberof BuilderService
     */
    buildTarget<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<any>;
    /**
     * build bootstrap target instance.
     *
     * @template T
     * @param {(Type<any> | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof IBuilderService
     */
    buildBootTarget<T>(target: Type<any> | BootOption | BootContext, ...args: string[]): Promise<T>;
    /**
     * build module.
     *
     * @template T
     * @param {(Type<any> | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    build<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<T>;

    /**
     * create runnable.
     *
     * @template T
     * @param {(Type<any> | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<IRunnable<T>>}
     * @memberof BuilderService
     */
    buildRunnable<T>(target: Type<any> | BootOption | BootContext, ...args: string[]): Promise<IRunnable<T>>;
    /**
     * run module.
     *
     * @template T
     * @param {(Type<any> | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof RunnerService
     */
    run<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<T>;
    /**
     * boot application.
     *
     * @template T
     * @param {(Type<any> | BootOption | T)} target
     * @param {((ctx: T) => void |BootSubAppOption<T> | string)} [options]
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof IBuilderService
     */
    boot<T extends BootContext>(target: Type<any> | BootOption | T, options?: (ctx: T) => void | BootSubAppOption<T> | string, ...args: string[]): Promise<T>;
    /**
     * boot application.
     *
     * @template T
     * @param {(Type<any> | BootOption | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    bootApp(application: IBootApplication, ...args: string[]): Promise<BootContext>;
}


export const BuilderServiceToken = new InjectToken<IBuilderService>('BOOT_BuilderService');
