import { Inject, Singleton, isFunction, ClassType, Type, IInjector, isPlainObject, lang, ROOT_INJECTOR } from '@tsdi/ioc';
import { BootOption, BuildOption, IBootContext, IBuildContext } from '../Context';
import { IBootApplication } from '../IBootApplication';
import { BootLifeScope, RunnableBuildLifeScope, StartupServiceScope } from '../boot/lifescope';
import { IBuilderService } from './IBuilderService';
import { BUILDER, CTX_OPTIONS } from '../tk';
import { IBuildHandle, ResolveScope } from '../builder/handles';
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
    async build<T>(target: ClassType<T> | BuildOption<T>): Promise<T> {
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
            const state = this.root.state();
            injector = state.isRegistered(md) ? state.getInjector(md) || this.root : this.root;
        }
        let rctx = { ...options, injector } as IBuildContext;
        await this.root.action().getInstance(ResolveScope)
            .execute(rctx);
        const value = rctx.value;
        lang.cleanObj(rctx);
        return value;
    }

    reslove<T>(target: ClassType<T> | BuildOption<T>): Promise<T> {
        return this.build(target);
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
            const state = this.root.state();
            injector = state.isRegistered(md) ? state.getInjector(md) || this.root : this.root;
        }
        const ctx = injector.getService({ token: BootContext, target: md, defaultToken: BootContext }, { provide: CTX_OPTIONS, useValue: options });
        await this.root.action().getInstance(StartupServiceScope).execute(ctx);
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
        return this.execLifeScope<T, Topt>(null, RunnableBuildLifeScope, target, ...args);
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
        return await this.execLifeScope(
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
                const state = this.root.state();
                injector = state.isRegistered(md) ? state.getInjector(md) || this.root : this.root;
            }
            ctx = injector.getService<T>({ token: BootContext, target: md, defaultToken: BootContext }, { provide: CTX_OPTIONS, useValue: options });
        }

        if (contextInit) {
            contextInit(ctx);
        }
        await this.root.action().getInstance(handle).execute(ctx);
        return ctx;
    }
}

export function isModuleContext(target: any): target is IBootContext {
    return (<IBootContext>target).reflect?.annoType === 'module';
}
