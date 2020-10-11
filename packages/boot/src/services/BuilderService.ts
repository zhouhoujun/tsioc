import {
    IocCoreService, Inject, Singleton, isFunction, isString, isClassType,
    ClassType, INJECTOR, lang, Type
} from '@tsdi/ioc';
import { IContainer, ICoreInjector } from '@tsdi/core';
import { IAnnoationContext, BootOption, IBootContext, IBuildOption, IBuildContext } from '../Context';
import { BootContext, isBootContext } from '../boot/ctx';
import { IBootApplication } from '../IBootApplication';
import { BootLifeScope, RunnableBuildLifeScope } from '../boot/lifescope';
import { IBuilderService } from './IBuilderService';
import { BuilderServiceToken, CTX_APP_ENVARGS, CTX_MODULE_EXPORTS, ROOT_INJECTOR } from '../tk';
import { ResolveMoudleScope } from '../builder/handles';
import { BuildContext } from '../builder/ctx';
import { IHandle } from '../handles/Handle';



/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 * @extends {IocCoreService}
 */
@Singleton(BuilderServiceToken)
export class BuilderService extends IocCoreService implements IBuilderService {

    @Inject(ROOT_INJECTOR)
    protected root: ICoreInjector;


    /**
     * resolve binding module.
     *
     * @template T
     * @param {ClassType<T> | IBuildOption} target
     * @param {IBuildOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async resolve<T>(target: ClassType<T> | IBuildOption<T>): Promise<T> {
        let ctx = await this.build(target);
        return ctx.value;
    }

    async build<T>(target: ClassType<T> | IBuildOption<T>): Promise<IBuildContext> {
        let injector: ICoreInjector;
        let options: IBuildOption;
        const container = this.root.getContainer();
        let md: ClassType;
        if (isClassType(target)) {
            injector = container.getInjector(target);
            options = { type: target };
            md = target;
        } else {
            md = target.type || target.module;
            injector = target.injector ?? target.parent?.injector;
            if (!injector) {
                injector = md ? container.getInjector(md) : this.root;
            }
            options = target;
        }
        let rctx: BuildContext;
        if (md) {
            rctx = injector.getService({ token: BuildContext, target: md, defaultToken: BuildContext });
            rctx.setOptions(options);
        } else {
            rctx = BuildContext.parse(injector, options);
        }
        rctx.setValue(INJECTOR, injector);
        await container.getActionInjector().getInstance(ResolveMoudleScope)
            .execute(rctx);
        return rctx;
    }

    /**
     * run module.
     *
     * @template T
     * @template Topt
     * @param {(ClassType | Topt | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    run<T extends IBootContext = IBootContext, Topt extends BootOption = BootOption>(target: ClassType | Topt | T, ...args: string[]): Promise<T> {
        const container = this.root.getContainer();
        return this.execLifeScope<T, Topt>(container, null, RunnableBuildLifeScope, target, ...args);
    }

    /**
     * boot application.
     *
     * @template T
     * @param {(Type | BootOption | T)} target
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BuilderService
     */
    async boot(application: IBootApplication, ...args: string[]): Promise<IBootContext> {
        const container = application.getContainer();
        return await this.execLifeScope(
            container,
            (ctx) => {
                if (isFunction(application.onContextInit)) {
                    application.onContextInit(ctx);
                }
            },
            BootLifeScope,
            application.target,
            ...args);
    }

    protected async execLifeScope<T extends IBootContext = IBootContext, Topt extends BootOption = BootOption>(
        container: IContainer,
        contextInit: (ctx: T) => void,
        handle: Type<IHandle>,
        target: ClassType | Topt | T,
        ...args: string[]): Promise<T> {

        let ctx: T;
        if (isBootContext(target)) {
            ctx = target as T;
        } else {
            let md: ClassType;
            let injector: ICoreInjector;
            if (isClassType(target)) {
                md = target;
            } else {
                md = target.type || target.module;
                injector = target.injector;
            }
            if (!injector) {
                injector = container.isRegistered(md) ? container.getInjector(md) : this.root;
            }
            ctx = injector.getService<IBootContext>({ token: BootContext, target: md, defaultToken: BootContext }) as T;
            ctx.setValue(INJECTOR, injector);
            if (isClassType(target)) {
                ctx.setOptions({ type: md });
            } else {
                ctx.setOptions(target)
            }
        }
        ctx.setValue(CTX_APP_ENVARGS, args);
        if (contextInit) {
            contextInit(ctx);
        }
        await container.getActionInjector().getInstance(handle).execute(ctx);
        return ctx;
    }
}
