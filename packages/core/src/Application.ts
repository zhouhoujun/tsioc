import { isFunction, Type, CtorType, EMPTY, ProviderType, Injector, Modules, ModuleDef, ModuleMetadata, Class, lang, Scopes, ModuleRef, getModuleType, createModuleRef } from '@tsdi/ioc';
import { ApplicationContext, ApplicationFactory, ApplicationOption, EnvironmentOption, PROCESS_ROOT } from './ApplicationContext';
import { DEFAULTA_PROVIDERS, ROOT_DEFAULT_PROVIDERS } from './providers';
import { ModuleLoader } from './ModuleLoader';
import { DefaultModuleLoader } from './impl/loader';
import { FilterModule } from './filters/filter.module';
import { ApplicationArguments } from './ApplicationArguments';


/**
 * application.
 * 
 * 应用程序启动入口
 *
 * @export
 * @class Application
 */
export class Application<T = any, TArg = ApplicationArguments> {

    private _loads?: Type[];
    /**
     * root module ref.
     * 
     * 应用程序启动根模块
     */
    readonly root: ModuleRef<T>;
    /**
     * application context.
     * 
     * 应用程序上下文
     */
    protected context!: ApplicationContext<T, TArg>;


    constructor(protected target: CtorType<T> | ApplicationOption<T, TArg>, protected loader?: ModuleLoader) {
        if (!isFunction(target)) {
            if (!this.loader) this.loader = target.loader;
            const providers = (target.platformProviders && target.platformProviders.length) ? [...this.getPlatformDefaultProviders(), ...target.platformProviders] : this.getPlatformDefaultProviders();
            target.deps = target.deps?.length ? [...this.getDeps(), ...target.deps] : this.getDeps();
            target.scope = Scopes.root;
            this.root = this.createInjector(providers, target)
        } else {
            const option = { module: target, deps: this.getDeps(), scope: Scopes.root };
            this.root = this.createInjector(this.getPlatformDefaultProviders(), option)
        }
        this.initRoot()
    }

    protected getPlatformDefaultProviders(): ProviderType[] {
        return DEFAULTA_PROVIDERS
    }

    protected getRootDefaultProviders(): ProviderType[] {
        return ROOT_DEFAULT_PROVIDERS;
    }

    protected initRoot() {
        this.root.setValue(Application, this)
    }

    /**
     * get application context.
     * 
     * 获取当前启动应用程序的上下文.
     *
     * @returns instance of {@link ApplicationContext}.
     */
    getContext(): ApplicationContext<T, TArg> {
        return this.context
    }

    /**
     * run application.
     * 
     * 根据配置启动运行应用程序
     *
     * @static
     * @param {ApplicationOption} option option of type {@link ApplicationOption}
     * @returns async returnning instance of {@link ApplicationContext}.
     */
    static run<T, TArg extends ApplicationArguments>(option: ApplicationOption<T, TArg>): Promise<ApplicationContext<T, TArg>>
    /**
     * run application.
     * 
     * 根据模块，环境变量启动运行应用程序
     *
     * @static
     * @param {Type<T>} target target class type.
     * @param {EnvironmentOption} [option] option {@link EnvironmentOption} application run depdences.
     * @returns async returnning instance of {@link ApplicationContext}.
     */
    static run<T, TArg extends ApplicationArguments>(target: Type<T>, option?: EnvironmentOption<TArg>): Promise<ApplicationContext<T, TArg>>;
    static run<T, TArg extends ApplicationArguments>(target: any, option?: EnvironmentOption<any>): Promise<ApplicationContext<T, TArg>> {
        return new Application<T, TArg>(option ? { module: target, ...option } as ApplicationOption : target).run();
    }

    /**
     * run application of module.
     * 
     * 启动应用程序
     *
     * @param {...string[]} args
     * @returns {Promise<ApplicationContext<T, TArg>>}
     */
    async run(): Promise<ApplicationContext<T, TArg>> {
        try {
            const ctx = await this.createContext();
            await this.prepareContext(ctx);
            await this.refreshContext(ctx);
            await this.callRunners(ctx);
            return ctx
        } catch (err) {
            await this.handleRunFailure(this.context, err);
            throw err
        }
    }

    /**
     * close application.
     * 
     * 关闭应用程序
     * 
     * @returns 
     */
    close() {
        return this.context.destroy();
    }

    get loadTypes(): Type[] {
        return this._loads ?? EMPTY
    }

    protected getDeps(): Modules[] {
        return []
    }

    protected createInjector<T, TArg>(providers: ProviderType[], option: ApplicationOption<T, TArg>) {
        const container = option.injector ?? Injector.create(providers);
        if (option.baseURL) {
            container.setValue(PROCESS_ROOT, option.baseURL)
        }
        if (this.loader) {
            container.setValue(ModuleLoader, this.loader)
        } else {
            this.loader = new DefaultModuleLoader();
        }
        option.platformDeps && container.use(...option.platformDeps);
        option.deps = [FilterModule, ...option.deps || EMPTY]
        option.providers = [...this.getRootDefaultProviders(), ...option.providers || EMPTY];
        return this.createModuleRef(container, option);
    }

    protected createModuleRef<T, TArg>(container: Injector, option: ApplicationOption<T, TArg>) {
        return createModuleRef(this.moduleify(option.module), container, option)
    }

    protected moduleify(module: Type | Class | ModuleMetadata | ModuleDef): Type | Class {
        if (isFunction(module)) return module;
        if (module instanceof Class) return module;

        return new Class(DynamicModule, {
            name: 'DynamicModule',
            type: DynamicModule,
            ...module,
            module: true,
            imports: module.imports ? getModuleType(module.imports) : [],
            exports: module.exports ? lang.getTypes<CtorType>(module.exports) : [],
            bootstrap: module.bootstrap ? lang.getTypes(module.bootstrap) : null
        } as ModuleDef);
    }

    protected async createContext(): Promise<ApplicationContext<T, TArg>> {
        if (!this.context) {
            const target = this.target;
            const root = this.root;
            if (isFunction(target)) {
                const modueRef = root.reflectiveFactory.create(target, root);
                this.context = modueRef.resolve(ApplicationFactory).create(root);
            } else {
                const modueRef = root.reflectiveFactory.create(root.moduleType, root);
                if (target.loads) {
                    this._loads = await this.root.get(ModuleLoader, this.loader).register(this.root, target.loads);
                }
                this.context = modueRef.resolve(ApplicationFactory).create(root, { ...target, providers: [] });
            }
        }
        return this.context
    }

    protected prepareContext(ctx: ApplicationContext<T, TArg>): any {
        const bootstraps = this.root.moduleReflect.getAnnotation<ModuleDef>().bootstrap;
        if (bootstraps && bootstraps.length) {
            bootstraps.forEach((type, order) => {
                ctx.runners.attach(type, { order });
            })
        }
    }

    protected refreshContext(ctx: ApplicationContext<T, TArg>): any {
        return ctx.refresh()
    }

    protected callRunners(ctx: ApplicationContext<T, TArg>): Promise<void> {
        return ctx.runners.run()
    }

    protected async handleRunFailure(ctx: ApplicationContext<T, TArg>, error: Error | any): Promise<void> {
        if (ctx) {
            const logger = ctx.getLogger();
            logger ? logger.error(error) : console.error(error);
            await ctx.destroy()
        } else {
            console.error(error)
        }
    }

}


class DynamicModule { }
