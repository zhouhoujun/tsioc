import { IocCoreService, Type, Inject, Singleton, isClass } from '@tsdi/ioc';
import { BootContext, BootOption, BootTargetToken } from '../BootContext';
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
        if (target instanceof BootContext) {
            ctx = target;
            if (!ctx.hasRaiseContainer()) {
                ctx.setRaiseContainer(this.container);
            }
        } else {
            let md = isClass(target) ? target : target.module;
            ctx = this.container.getService(BootContext, md, { provide: BootTargetToken, useValue: md });
            if (!isClass(target)) {
                ctx.setOptions(target);
            }
        }
        ctx.args = args;
        await this.container.resolve(RunnableBuildLifeScope).execute(ctx);
        return ctx as T;
    }
}
