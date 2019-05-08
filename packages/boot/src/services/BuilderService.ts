import { IocCoreService, Type, Inject, Singleton, isClass, Autorun, ProviderTypes } from '@tsdi/ioc';
import { BootContext, BootOption, BootTargetToken } from '../BootContext';
import { IContainer, ContainerToken, isContainer } from '@tsdi/core';
import { CompositeHandle, HandleRegisterer } from '../core';
import { ModuleBuilderLifeScope, RunnableBuildLifeScope, ResolveMoudleScope, BuildContext } from '../builder';



/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 * @extends {IocCoreService}
 */
@Singleton()
@Autorun('setup')
export class BuilderService extends IocCoreService {

    @Inject(ContainerToken)
    protected container: IContainer;

    setup() {
        this.container.get(HandleRegisterer)
            .register(this.container, ResolveMoudleScope, true)
            .register(this.container, ModuleBuilderLifeScope, true)
            .register(this.container, RunnableBuildLifeScope, true);
    }

    /**
     * binding resolve.
     *
     * @template T
     * @param {Type<any>} target
     * @param {*} bindingTemplate
     * @param {(IContainer | ProviderTypes)} [container]
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async resolve<T>(target: Type<any>, bindingTemplate: any, container?: IContainer | ProviderTypes, ...providers: ProviderTypes[]): Promise<T> {
        let raiseContainer: IContainer;
        if (isContainer(container)) {
            raiseContainer = container;
        } else {
            providers.unshift(container as ProviderTypes);
            raiseContainer = this.container;
        }
        let rctx = BuildContext.parse(target, bindingTemplate, raiseContainer);
        rctx.providers = providers;
        await this.container.get(ResolveMoudleScope)
            .execute(rctx);
        return rctx.target;
    }

    async create<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<any> {
        let ctx = await this.build(target, ...args);
        return ctx.getBootTarget();
    }

    /**
     * build module.
     *
     * @template T
     * @param {(Type<any> | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    build<T extends BootContext>(target: Type<any> | BootOption | T, ...args: string[]): Promise<T> {
        return this.execLifeScope(this.container.get(ModuleBuilderLifeScope), target, ...args);
    }

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

    protected async execLifeScope<T extends BootContext>(scope: CompositeHandle<BootContext>, target: Type<any> | BootOption | T, ...args: string[]): Promise<T> {
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
        await scope.execute(ctx);
        return ctx as T;
    }
}
