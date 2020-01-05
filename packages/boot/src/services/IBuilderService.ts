import { IocCoreService, InjectToken, ClassType } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BootContext, BootOption } from '../BootContext';
import { IBootApplication } from '../IBootApplication';
import { IBuildOption } from '../builder/IBuildOption';
import { IStartup } from '../runnable/Startup';
import { BuildContext } from '../builder/BuildContext';

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
     * build target.
     *
     * @template T
     * @param {(ClassType<T> | IBuildOption<T>)} target
     * @returns {Promise<BuildContext>}
     * @memberof IBuilderService
     */
    build<T>(target: ClassType<T> | IBuildOption<T>): Promise<BuildContext>;

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

    run(target: ClassType | BootOption | BootContext, ...args: string[]): Promise<BootContext>
    run<Topt extends BootOption>(target: ClassType | Topt | BootContext, ...args: string[]): Promise<BootContext>;
    run<T extends BootContext>(target: ClassType | BootOption | T, ...args: string[]): Promise<T>;
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
    run<T extends BootContext, Topt extends BootOption>(target: ClassType | Topt | T, ...args: string[]): Promise<T>;
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
    boot<T extends BootContext, Topt extends BootOption = BootOption>(target: ClassType | Topt | T, options?: (ctx: T) => void | BootSubAppOption<T> | string, ...args: string[]): Promise<T>;
    /**
     * boot application.
     *
     * @param {IBootApplication} application
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof IBuilderService
     */
    bootApp(application: IBootApplication, ...args: string[]): Promise<BootContext>;
}


export const BuilderServiceToken = new InjectToken<IBuilderService>('BOOT_BuilderService');
