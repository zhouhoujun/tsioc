import { ClassType } from '@tsdi/ioc';
import { BootOption, IBootContext } from '../Context';
import { IBootApplication } from '../IBootApplication';


/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 */
export interface IBuilderService {
    /**
     * startup runnable service.
     * @param target service.
     */
    statrup<T>(target: ClassType<T> | BootOption<T>): Promise<any>;

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
     */
    run<T extends IBootContext, Topt extends BootOption>(target: ClassType | Topt | T, ...args: string[]): Promise<T>;
    /**
     * create context.
     * @param target 
     * @param args 
     */
    createContext<T extends IBootContext, Topt extends BootOption>(target: ClassType | Topt | T, args: string[]): T;

    /**
     * boot with root conext.
     * @param context 
     */
    boot(root: IBootContext): Promise<void>;
}

