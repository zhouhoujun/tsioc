import { IocCoreService, Inject, Singleton, isFunction, isClassType, ClassType, Type } from '@tsdi/ioc';
import { IContainer, ICoreInjector } from '@tsdi/core';
import { BootOption, IBootContext, BuildOption, IBuildContext } from '../Context';
import { IBootApplication } from '../IBootApplication';
import { BootLifeScope, RunnableBuildLifeScope, StartupServiceScope } from '../boot/lifescope';
import { IBuilderService } from './IBuilderService';
import { BUILDER, CTX_OPTIONS, ROOT_INJECTOR } from '../tk';
import { ResolveMoudleScope } from '../builder/handles';
import { IHandle } from '../handles/Handle';
import { BuildContext } from '../builder/ctx';
import { BootContext } from '../boot/ctx';



/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 * @extends {IocCoreService}
 */
@Singleton(BUILDER)
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

    async build<T>(target: ClassType<T> | BuildOption<T>): Promise<IBuildContext> {
        let injector: ICoreInjector;
        let options: BuildOption;
        const container = this.root.getContainer();
        let md: ClassType;
        if (isClassType(target)) {
            options = { type: target };
            md = target;
        } else {
            md = target.type;
            injector = target.injector;
            options = target;
        }
        if (!injector) {
            injector = container.regedState.isRegistered(md) ? container.regedState.getInjector(md) || this.root : this.root;
        }
        let rctx = injector.getService({ token: BuildContext, target: md, defaultToken: BuildContext }, { provide: CTX_OPTIONS, useValue: options });
        await container.getActionInjector().getInstance(ResolveMoudleScope)
            .execute(rctx);
        return rctx;
    }

    async statrup<T>(target: ClassType<T> | BootOption<T>): Promise<any> {
        const container = this.root.getContainer();
        let md: ClassType;
        let injector: ICoreInjector;
        let options: BootOption<T>;
        if (isClassType(target)) {
            md = target;
            options = { bootstrap: md };
        } else {
            md = target.type;
            injector = target.injector;
            options = { bootstrap: md, ...target };
        }
        if (!injector) {
            injector = container.regedState.isRegistered(md) ? container.regedState.getInjector(md) || this.root : this.root;
        }
        const ctx = injector.getService({ token: BootContext, target: md, defaultToken: BootContext }, { provide: CTX_OPTIONS, useValue: options });
        await container.getActionInjector().getInstance(StartupServiceScope).execute(ctx);
        return ctx.getStartup();
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
        if (isModuleContext(target)) {
            ctx = target as T;
        } else {
            let md: ClassType;
            let injector: ICoreInjector;
            let options: BootOption;
            if (isClassType(target)) {
                md = target;
                options = { type: md, args };
            } else {
                md = target.type;
                injector = target.injector;
                options = { ...target, args };
            }
            if (!injector) {
                injector = container.regedState.isRegistered(md) ? container.regedState.getInjector(md) || this.root : this.root;
            }
            ctx = injector.getService<T>({ token: BootContext, target: md, defaultToken: BootContext }, { provide: CTX_OPTIONS, useValue: options });
        }

        if (contextInit) {
            contextInit(ctx);
        }
        await container.getActionInjector().getInstance(handle).execute(ctx);
        return ctx;
    }
}

export function isModuleContext(target: any): target is IBootContext {
    return (<IBootContext>target).reflect?.annoType === 'module';
}
