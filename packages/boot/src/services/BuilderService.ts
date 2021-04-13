import { Inject, Singleton, isFunction, ClassType, Type, IInjector, IContainer, isPlainObject, lang } from '@tsdi/ioc';
import { BootOption, BuildOption, IBootContext, IBuildContext } from '../Context';
import { IBootApplication } from '../IBootApplication';
import { BootLifeScope, RunnableBuildLifeScope, StartupServiceScope } from '../boot/lifescope';
import { IBuilderService } from './IBuilderService';
import { BUILDER, CTX_OPTIONS, ROOT_INJECTOR } from '../tk';
import { IBuildHandle, ResolveMoudleScope } from '../builder/handles';
import { BootContext } from '../boot/ctx';



/**
 * service run runnable module.
 *
 * @export
 * @class BuilderService
 */
@Singleton(BUILDER)
export class BuilderService implements IBuilderService {

    static ρNPT = true;

    @Inject(ROOT_INJECTOR)
    protected root: IInjector;


    /**
     * resolve binding module.
     *
     * @template T
     * @param {ClassType<T> | IBuildOption} target
     * @param {IBuildOption} options
     * @param {...ProviderTypes[]} providers
     * @returns {Promise<T>}
     */
    async resolve<T>(target: ClassType<T> | BuildOption<T>): Promise<T> {
        let injector: IInjector;
        let options: BuildOption;
        let md: ClassType;
        if (isPlainObject<BuildOption>(target)) {
            md = target.type;
            injector = target.injector;
            options = target;
        } else {
            options = { type: target };
            md = target;
        }
        if (!injector) {
            injector = this.root.getRegedState().isRegistered(md) ? this.root.getRegedState().getInjector(md) || this.root : this.root;
        }
        let rctx = { ...options, injector } as IBuildContext;
        await this.root.getActionProvider().getInstance(ResolveMoudleScope)
            .execute(rctx);
        const value = rctx.value;
        lang.cleanObj(rctx);
        return value;
    }

    async statrup<T>(target: ClassType<T> | BootOption<T>): Promise<any> {
        let md: ClassType;
        let injector: IInjector;
        let options: BootOption<T>;
        if (isPlainObject<BootOption>(target)) {
            md = target.type;
            injector = target.injector;
            options = { bootstrap: md, ...target };
        } else {
            md = target;
            options = { bootstrap: md };
        }
        if (!injector) {
            injector = this.root.getRegedState().isRegistered(md) ? this.root.getRegedState().getInjector(md) || this.root : this.root;
        }
        const ctx = injector.getService({ token: BootContext, target: md, defaultToken: BootContext }, { provide: CTX_OPTIONS, useValue: options });
        await this.root.getActionProvider().getInstance(StartupServiceScope).execute(ctx);
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
        handle: Type<IBuildHandle>,
        target: ClassType | Topt | T,
        ...args: string[]): Promise<T> {

        let ctx: T;
        if (isModuleContext(target)) {
            ctx = target as T;
        } else {
            let md: ClassType;
            let injector: IInjector;
            let options: BootOption;
            if (isPlainObject<Topt>(target)) {
                md = target.type;
                injector = target.injector;
                options = { ...target, args };
            } else {
                md = target;
                options = { type: md, args };
            }
            if (!injector) {
                injector = container.regedState.isRegistered(md) ? container.regedState.getInjector(md) || this.root : this.root;
            }
            ctx = injector.getService<T>({ token: BootContext, target: md, defaultToken: BootContext }, { provide: CTX_OPTIONS, useValue: options });
        }

        if (contextInit) {
            contextInit(ctx);
        }
        await container.provider.getInstance(handle).execute(ctx);
        return ctx;
    }
}

export function isModuleContext(target: any): target is IBootContext {
    return (<IBootContext>target).reflect?.annoType === 'module';
}
