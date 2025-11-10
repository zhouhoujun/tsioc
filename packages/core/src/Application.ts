import { isFunction, AbstractType, Type, Provider, Injector, Modules, ModuleDef, ModuleMetadata, ClassRef, lang, ModuleRef, getModuleType, createModuleRef, ModuleType,createInjector, getClassRef, Operator } from '@tsdi/ioc';
import { ApplicationContext, ApplicationContextFactory, ApplicationOption, EnvironmentOption, PROCESS_ROOT } from './ApplicationContext';
import { DEFAULTA_PROVIDERS, ROOT_DEPENDENCE_PROVIDERS, } from './providers';
import { ModuleLoader } from './ModuleLoader';
import { DefaultModuleLoader } from './impl/loader';
import { TransformModule } from './pipes/transform';



/**
 * application.
 * 
 * 应用程序启动入口
 *
 * @export
 * @class Application
 */
export class Application<T = any> {

    private _loads?: AbstractType[];
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
    protected context!: ApplicationContext<T>;

    /**
     * module loader
     */
    protected loader!: ModuleLoader;


    constructor(protected target: Type<T> | ApplicationOption<T>, loader?: ModuleLoader) {
        if (loader) {
            this.loader = loader;
        }
        if (!isFunction(target)) {
            if (!this.loader && target.loader) this.loader = target.loader;
            const providers = target.platformProviders?.length ? [this.getPlatformDefaultProviders(), target.platformProviders] : this.getPlatformDefaultProviders();
            target.deps = [this.getDeps(), target.deps ?? []];
            target.scope = 'root';
            this.root = this.createInjector(providers, target)
        } else {
            const option = { module: target, deps: this.getDeps(), scope: 'root' } as ApplicationOption<T>;
            this.root = this.createInjector(this.getPlatformDefaultProviders(), option)
        }
    }

    protected getPlatformDefaultProviders(): Provider[] {
        return DEFAULTA_PROVIDERS
    }

    protected getRootDependencies(): ModuleType[] {
        return [];
    }

    protected getRootDependenceProviders(): Provider[] {
        return ROOT_DEPENDENCE_PROVIDERS;
    }

    protected getRootDefaultProviders(): Provider[] {
        return [];
    }

    /**
     * get application context.
     * 
     * 获取当前启动应用程序的上下文.
     *
     * @returns instance of {@link ApplicationContext}.
     */
    getContext(): ApplicationContext<T> {
        return this.context
    }

    /**
     * bootstrap application.
     * 
     * 根据配置启动运行应用程序
     *
     * @static
     * @param {ApplicationOption} option option of type {@link ApplicationOption}
     * @returns async returnning instance of {@link ApplicationContext}.
     */
    static run<T>(option: ApplicationOption<T>): Promise<ApplicationContext<T>>
    /**
     * bootstrap application.
     * 
     * 根据模块，环境变量启动运行应用程序
     *
     * @static
     * @param {AbstractType<T>} target target class type.
     * @param {EnvironmentOption} [option] option {@link EnvironmentOption} application run depdences.
     * @returns async returnning instance of {@link ApplicationContext}.
     */
    static run<T>(target: AbstractType<T>, option?: EnvironmentOption): Promise<ApplicationContext<T>>;
    static run<T>(target: any, option?: EnvironmentOption): Promise<ApplicationContext<T>> {
        return new Application<T>(option ? { module: target, ...option } as ApplicationOption : target).run();
    }

    /**
     * run application of module.
     * 
     * 启动应用程序
     *
     * @param {...string[]} args
     * @returns {Promise<ApplicationContext<T, TArg>>}
     */
    async run(): Promise<ApplicationContext<T>> {
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

    get loadTypes(): AbstractType[] {
        return this._loads ?? []
    }

    protected getDeps(): Modules[] {
        return [TransformModule]
    }


    protected createInjector<T>(providers: Provider[], option: ApplicationOption<T>) {
        const container = option.injector ?? createInjector(providers);
        if (option.baseURL) {
            Operator.setValue(container, PROCESS_ROOT, option.baseURL);
        }
        if (this.loader) {
            Operator.setValue(container, ModuleLoader, this.loader);
        } else {
            this.loader = new DefaultModuleLoader();
        }
        option.platformDeps &&  Operator.use(container, option.platformDeps);
        // option.depProviders = [this.getRootDependenceProviders() ?? Empty, option.depProviders ?? Empty];
        option.deps = [this.getRootDependencies(), option.deps ?? []];
        option.providers = [this.getRootDependenceProviders(), this.getRootDefaultProviders(), option.providers ?? []];
        return this.createModuleRef(container, option);
    }

    protected createModuleRef<T>(container: Injector, option: ApplicationOption<T>) {
        return createModuleRef(this.moduleify(option.module), container, option)
    }

    protected moduleify(module: AbstractType | ClassRef | ModuleMetadata | ModuleDef): Type | ClassRef {
        if (isFunction(module)) {
            module = getClassRef(module);
        }

        if (module instanceof ClassRef) {
            if (!module.getAnnotation<ModuleDef>().module) {
                const bootstrapType = module.type as Type;
                return new ClassRef(DynamicModule, {
                    name: 'DynamicModule',
                    type: DynamicModule,
                    module: true,
                    declarations: [bootstrapType],
                    bootstrap: [bootstrapType],
                } as Partial<ModuleDef>);
            }
            return module;
        }

        return new ClassRef(DynamicModule, {
            name: 'DynamicModule',
            type: DynamicModule,
            ...module,
            module: true,
            imports: module.imports ? getModuleType(module.imports) : [],
            exports: module.exports ? lang.getTypes<Type>(module.exports, true) : [],
            bootstrap: module.bootstrap ? lang.getTypes(module.bootstrap) : null
        } as ModuleDef);
    }

    protected initRoot() {
         Operator.setValue(this.root, Application, this);
        if (!this.loader) {
            this.loader = this.root.get(ModuleLoader);
        }
    }

    protected async createContext(): Promise<ApplicationContext<T>> {
        if (!this.context) {
            const target = this.target;
            const root = this.root;
            await root.ready;
            this.initRoot();
            if (isFunction(target)) {
                this.context =  root.get(ApplicationContextFactory).create(root);
            } else {
                if (target.loads) {
                    this._loads = await this.loader.register(this.root, target.loads);
                }
                this.context =  root.get(ApplicationContextFactory).create(root, { ...target, providers: [] });
            }
        }
        return this.context
    }

    protected prepareContext(ctx: ApplicationContext<T>): any {
        const bootstraps = this.root.moduleReflect.getAnnotation<ModuleDef>().bootstrap;
        if (bootstraps && bootstraps.length) {
            bootstraps.forEach((type, order) => {
                ctx.runners.attach(type, { order });
            })
        }
    }

    protected refreshContext(ctx: ApplicationContext<T>): any {
        return ctx.refresh()
    }

    protected callRunners(ctx: ApplicationContext<T>): Promise<void> {
        return ctx.runners.run()
    }

    protected async handleRunFailure(ctx: ApplicationContext<T>, error: Error | any): Promise<void> {
        if (ctx && !ctx.destroyed) {
            const logger = ctx.getLogger();
            logger ? logger.error(error) : console.error(error);
            await ctx.destroy()
        } else {
            console.error(error)
        }
    }

}

/**
 * bootstrap application.
 * 
 * 根据配置启动运行应用程序
 * 
 * @param {ApplicationOption} option option of type {@link ApplicationOption}
 * @returns async returnning instance of {@link ApplicationContext}.
 */
export function bootstrapApplication<T>(option: ApplicationOption<T>): Promise<ApplicationContext<T>>;
/**
 * bootstrap application.
 * 
 * 根据模块，环境变量启动运行应用程序
 *
 * @param {AbstractType<T>} target target class type.
 * @param {EnvironmentOption} [option] option {@link EnvironmentOption} application run depdences.
 * @returns async returnning instance of {@link ApplicationContext}.
 */
export function bootstrapApplication<T>(target: AbstractType<T>, option?: EnvironmentOption): Promise<ApplicationContext<T>>;
export function bootstrapApplication<T>(target: any, option?: EnvironmentOption): Promise<ApplicationContext<T>> {
    return new Application<T>(option ? { module: target, ...option } as ApplicationOption : target).run();
}

class DynamicModule { }
