import { IocCoreService, ClassType } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { BootOption, IBootContext, IBuildOption, IBuildContext } from '../Context';
import { IBootApplication } from '../IBootApplication';

export interface BootSubAppOption<T extends IBootContext> {
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
    regExports?: (ctx: T, parent: ICoreInjector) => void;
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
     * build target.
     *
     * @template T
     * @param {(ClassType<T> | IBuildOption<T>)} target
     * @returns {Promise<IBuildContext>}
     * @memberof IBuilderService
     */
    build<T>(target: ClassType<T> | IBuildOption<T>): Promise<IBuildContext>;

    /**
     * resolve binding module.
     *
     * @template T
     * @param {Type} target
     * @param {IBuildOption<T>} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    resolve<T>(target: ClassType<T> | IBuildOption<T>): Promise<T>;

    run(target: ClassType | BootOption | IBootContext, ...args: string[]): Promise<IBootContext>
    run<Topt extends BootOption>(target: ClassType | Topt | IBootContext, ...args: string[]): Promise<IBootContext>;
    run<T extends IBootContext>(target: ClassType | BootOption | T, ...args: string[]): Promise<T>;
    /**
     * run module.
     *
     * @template T
     * @template Topt
     * @param {(ClassType | Topt | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof IBuilderService
     */
    run<T extends IBootContext, Topt extends BootOption>(target: ClassType | Topt | T, ...args: string[]): Promise<T>;
    /**
     * boot application.
     *
     * @template T
     * @template Topt
     * @param {(ClassType | Topt | T)} target
     * @param {((ctx: T) => void | BootSubAppOption<T> | string)} [options]
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof IBuilderService
     */
    boot<T extends IBootContext, Topt extends BootOption = BootOption>(target: ClassType | Topt | T, options?: (ctx: T) => void | BootSubAppOption<T> | string, ...args: string[]): Promise<T>;
    /**
     * boot application.
     *
     * @param {IBootApplication} application
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof IBuilderService
     */
    bootApp(application: IBootApplication, ...args: string[]): Promise<IBootContext>;
}

