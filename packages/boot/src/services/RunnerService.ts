import { IocCoreService, Type, Inject, Singleton } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { IContainer, ContainerToken } from '@tsdi/core';
import { RunnableBuildLifeScope } from './RunnableBuildLifeScope';


/**
 * service run runnable module.
 *
 * @export
 * @class RunnerService
 * @extends {IocCoreService}
 */
@Singleton
export class RunnerService extends IocCoreService {

    @Inject(ContainerToken)
    protected container: IContainer;

    /**
     * run module.
     *
     * @template T
     * @param {(Type<any> | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof RunnerService
     */
    async run<T extends BootContext>(target: Type<any> | T, ...args: string[]): Promise<T> {
        let ctx = target instanceof BootContext ?
            target
            :
            BootContext.parse({
                type: target,
                args: args
            }, this.container);
        await this.container.resolve(RunnableBuildLifeScope).execute(ctx);
        return ctx as T;
    }
}
