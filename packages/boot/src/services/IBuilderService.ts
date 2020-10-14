import { IocCoreService, ClassType } from '@tsdi/ioc';
import { BootOption, IBootContext, BuildOption, IBuildContext } from '../Context';
import { IBootApplication } from '../IBootApplication';
import { IStartup } from '../runnable/Startup';


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
     * @returns {Promise<IBuildContext>}
     * @memberof IBuilderService
     */
    build<T>(target: ClassType<T> | BuildOption<T>): Promise<IBuildContext>;

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

    /**
     * startup service.
     * @param target service.
     */
    statrup<T>(target: ClassType<T> | BootOption<T>): Promise<IStartup<T>>;

    /**
     * run module.
     * @param target module or module config.
     * @param args run env args.
     */
    run(target: ClassType | BootOption, ...args: string[]): Promise<IBootContext>
    /**
     * run module.
     * @param target module or module config.
     * @param args run env args
     */
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
     * @param {IBootApplication} application
     * @param {...string[]} args
     * @returns {Promise<IBootContext>}
     * @memberof IBuilderService
     */
    boot(application: IBootApplication, ...args: string[]): Promise<IBootContext>;
}

