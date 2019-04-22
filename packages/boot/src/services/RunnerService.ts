import { Type, Singleton } from '@tsdi/ioc';
import { BootContext, BootOption } from '../BootContext';
import { RunnableBuildLifeScope } from './RunnableBuildLifeScope';
import { BuilderService } from './BuilderService';


/**
 * service run runnable module.
 *
 * @export
 * @class RunnerService
 * @extends {IocCoreService}
 */
@Singleton
export class RunnerService extends BuilderService {

    /**
     * run module.
     *
     * @template T
     * @param {(Type<any> | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof RunnerService
     */
    run<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<T> {
        return this.execLifeScope(this.container.get(RunnableBuildLifeScope), target, ...args);
    }
}
