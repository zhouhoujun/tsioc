import { IocCoreService, Type, Inject, Singleton, isClass } from '@tsdi/ioc';
import { BootContext, BootOption } from '../BootContext';
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
    async run<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<T> {
        let ctx: BootContext;
        if (isClass(target)) {
            ctx = BootContext.parse({ module: target, args: args }, this.container);
        } else if (target instanceof BootContext) {
            ctx = target;
        } else {
            ctx = BootContext.parse(target, this.container);
        }
        await this.container.resolve(RunnableBuildLifeScope).execute(ctx);
        return ctx as T;
    }
}
