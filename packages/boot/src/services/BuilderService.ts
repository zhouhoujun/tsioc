import { IocCoreService, Type, Inject, Singleton, isClass } from '@tsdi/ioc';
import { BootContext, BootOption, BootTargetToken } from '../BootContext';
import { IContainer, ContainerToken } from '@tsdi/core';
import { ModuleBuilderLifeScope } from './ModuleBuilderLifeScope';


/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 * @extends {IocCoreService}
 */
@Singleton
export class BuilderService extends IocCoreService {

    @Inject(ContainerToken)
    protected container: IContainer;

    async create<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<any> {
        let ctx = await this.build(target, ...args);
        return ctx.target;
    }

    /**
     * run module.
     *
     * @template T
     * @param {(Type<any> | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async build<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<T> {
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
        await this.container.resolve(ModuleBuilderLifeScope).execute(ctx);
        return ctx as T;
    }
}
