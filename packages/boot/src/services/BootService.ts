import { Type, Singleton } from '@tsdi/ioc';
import { BootContext, BootOption } from '../BootContext';
import { BuilderService } from './BuilderService';
import { BootBuilderLifeScope } from './BootBuilderLifeScope';


/**
 * service run runnable module.
 *
 * @export
 * @class RunnerService
 * @extends {IocCoreService}
 */
@Singleton
export class BootService extends BuilderService {

    /**
     * build boot instance.
     *
     * @template T
     * @param {(Type<any> | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof RunnerService
     */
    build<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<T> {
        return this.execLifeScope(this.container.get(BootBuilderLifeScope), target, ...args);
    }

    async create<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<any> {
        let ctx = await this.build(target, ...args);
        return ctx.bootstrap;
    }
}
