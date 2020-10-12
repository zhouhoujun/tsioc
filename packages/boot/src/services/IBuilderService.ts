import { IocCoreService, ClassType } from '@tsdi/ioc';
import { BootOption, BootContext, BuildOption, BuildContext } from '../Context';
import { IBootApplication } from '../IBootApplication';


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
     * @param {(ClassType<T> | BuildOption<T>)} target
     * @returns {Promise<BuildContext>}
     * @memberof IBuilderService
     */
    build<T>(target: ClassType<T> | BuildOption<T>): Promise<BuildContext>;

    /**
     * resolve binding module.
     *
     * @template T
     * @param {Type} target
     * @param {BuildOption<T>} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    resolve<T>(target: ClassType<T> | BuildOption<T>): Promise<T>;

    run(target: ClassType | BootOption, ...args: string[]): Promise<BootContext>
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
     * @param {IBootApplication} application
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof IBuilderService
     */
    boot(application: IBootApplication, ...args: string[]): Promise<BootContext>;
}

