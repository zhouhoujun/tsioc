import {
    IocCoreService, Inject, Singleton, isFunction, isClassType, ClassType, Type
} from '@tsdi/ioc';
import { IContainer, ICoreInjector } from '@tsdi/core';
import { BootOption, BootContext, BuildOption, BuildContext } from '../Context';
import { IBootApplication } from '../IBootApplication';
import { BootLifeScope, RunnableBuildLifeScope } from '../boot/lifescope';
import { IBuilderService } from './IBuilderService';
import { BuilderServiceToken, ROOT_INJECTOR } from '../tk';
import { ResolveMoudleScope } from '../builder/handles';
import { IHandle } from '../handles/Handle';
import { BuildContextFactory, BootContextFactory, DefaultBootContextFactory, DefaultBuildContextFactory } from '../ContextFactory';



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
    async resolve<T>(target: ClassType<T> | BuildOption<T>): Promise<T> {
        let ctx = await this.build(target);
        return ctx.value;
    }

    async build<T>(target: ClassType<T> | BuildOption<T>): Promise<BuildContext> {
        let injector: ICoreInjector;
        let options: BuildOption;
        const container = this.root.getContainer();
        let md: ClassType;
        if (isClassType(target)) {
            injector = container.getInjector(target);
            options = { type: target };
            md = target;
        } else {
            md = target.type;
            injector = target.injector;
            if (!injector) {
                injector = md ? container.getInjector(md) : this.root;
            }
            options = target;
        }
        let rctx = injector.getService({ token: BuildContextFactory, target: md, defaultToken: DefaultBuildContextFactory })?.create(options, injector);
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
    run<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(target: ClassType | Topt | T, ...args: string[]): Promise<T> {
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
    async boot(application: IBootApplication, ...args: string[]): Promise<BootContext> {
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

    protected async execLifeScope<T extends BootContext = BootContext, Topt extends BootOption = BootOption>(
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
                md = target.type;
                injector = target.injector;
            }
            if (!injector) {
                injector = container.isRegistered(md) ? container.getInjector(md) : this.root;
            }
            ctx = injector.getService({ token: BootContextFactory, target: md, defaultToken: DefaultBootContextFactory })?.create(isClassType(target) ? { type: md, args } : { ...target, args }, injector) as T;
        }

        if (contextInit) {
            contextInit(ctx);
        }
        await container.getActionInjector().getInstance(handle).execute(ctx);
        return ctx;
    }
}

export function isBootContext(target: any): target is BootContext {
    return target.reflect?.moduleDecorator;
}
