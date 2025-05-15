import { isFunction, Type, ClassType, Provider, Injector, Modules, ModuleDef, ModuleMetadata, Class, lang, ModuleRef, getModuleType, createModuleRef, ModuleType, isType, Empty, createInjector, getClass } from '@tsdi/ioc';
import { ApplicationContext, ApplicationContextFactory, ApplicationOption, EnvironmentOption, PROCESS_ROOT } from './ApplicationContext';
import { DEFAULTA_PROVIDERS, ROOT_DEPENDENCE_PROVIDERS, } from './providers';
import { ModuleLoader } from './ModuleLoader';
import { DefaultModuleLoader } from './impl/loader';
import { ApplicationArguments } from './ApplicationArguments';
import { TransformModule } from './pipes/transform';



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

    /**
     * module loader
     */
    protected loader!: ModuleLoader;


    constructor(protected target: ClassType<T> | ApplicationOption<T, TArg>, loader?: ModuleLoader) {
        if (loader) {
            this.loader = loader;
        }
        if (!isType(target)) {
            if (!this.loader && target.loader) this.loader = target.loader;
            const providers = target.platformProviders?.length ? [this.getPlatformDefaultProviders(), target.platformProviders] : this.getPlatformDefaultProviders();
            target.deps = [this.getDeps() ?? Empty, target.deps ?? Empty];
            target.scope = 'root';
            this.root = this.createInjector(providers, target)
        } else {
            const option = { module: target, deps: this.getDeps() ?? Empty, scope: 'root' };
            this.root = this.createInjector(this.getPlatformDefaultProviders(), option)
        }
    }

    protected getPlatformDefaultProviders(): Provider[] {
        return DEFAULTA_PROVIDERS
    }

    protected getRootDependencies(): ModuleType[] | null {
        return null;
    }

    protected getRootDependenceProviders(): Provider[] {
        return ROOT_DEPENDENCE_PROVIDERS;
    }

    protected getRootDefaultProviders(): Provider[] | null {
        return null;
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
     * bootstrap application.
     * 
     * 根据配置启动运行应用程序
     *
     * @static
     * @param {ApplicationOption} option option of type {@link ApplicationOption}
     * @returns async returnning instance of {@link ApplicationContext}.
     */
    static run<T, TArg extends ApplicationArguments>(option: ApplicationOption<T, TArg>): Promise<ApplicationContext<T, TArg>>
    /**
     * bootstrap application.
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
        return this._loads ?? Empty
    }

    protected getDeps(): Modules[] | null {
        return [TransformModule]
    }


    protected createInjector<T, TArg>(providers: Provider[], option: ApplicationOption<T, TArg>) {
        const container = option.injector ?? createInjector(providers);
        if (option.baseURL) {
            container.setValue(PROCESS_ROOT, option.baseURL)
        }
        if (this.loader) {
            container.setValue(ModuleLoader, this.loader)
        } else {
            this.loader = new DefaultModuleLoader();
        }
        option.platformDeps && container.use(option.platformDeps);
        // option.depProviders = [this.getRootDependenceProviders() ?? Empty, option.depProviders ?? Empty];
        option.deps = [this.getRootDependencies() ?? Empty, option.deps ?? Empty];
        option.providers = [this.getRootDependenceProviders() ?? Empty, this.getRootDefaultProviders() ?? Empty, option.providers ?? Empty];
        return this.createModuleRef(container, option);
    }

    protected createModuleRef<T, TArg>(container: Injector, option: ApplicationOption<T, TArg>) {
        return createModuleRef(this.moduleify(option.module), container, option)
    }

    protected moduleify(module: Type | Class | ModuleMetadata | ModuleDef): Type | Class {
        if (isType(module)) {
            module = getClass(module);
        }

        if (module instanceof Class) {
            if (!module.getAnnotation<ModuleDef>().module) {
                const bootstrapType = module.type as ClassType;
                return new Class(DynamicModule, {
                    name: 'DynamicModule',
                    type: DynamicModule,
                    module: true,
                    declarations: [bootstrapType],
                    bootstrap: [bootstrapType],
                } as ModuleDef);
            }
            return module;
        }

        return new Class(DynamicModule, {
            name: 'DynamicModule',
            type: DynamicModule,
            ...module,
            module: true,
            imports: module.imports ? getModuleType(module.imports) : Empty,
            exports: module.exports ? lang.getTypes<ClassType>(module.exports) : Empty,
            bootstrap: module.bootstrap ? lang.getTypes(module.bootstrap) : null
        } as ModuleDef);
    }

    protected initRoot() {
        this.root.setValue(Application, this);
        if (!this.loader) {
            this.loader = this.root.get(ModuleLoader);
        }
    }

    protected async createContext(): Promise<ApplicationContext<T, TArg>> {
        if (!this.context) {
            const target = this.target;
            const root = this.root;
            await root.ready;
            this.initRoot();
            if (isFunction(target)) {
                // const modueRef = root.get(ReflectiveFactory).create(target);
                this.context = root.resolve(ApplicationContextFactory).create(root);
            } else {
                // const modueRef = root.get(ReflectiveFactory).create(root.moduleType);
                if (target.loads) {
                    this._loads = await this.loader.register(this.root, target.loads);
                }
                this.context = root.resolve(ApplicationContextFactory).create(root, { ...target, providers: Empty });
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

/**
 * bootstrap application.
 * 
 * 根据配置启动运行应用程序
 * 
 * @param {ApplicationOption} option option of type {@link ApplicationOption}
 * @returns async returnning instance of {@link ApplicationContext}.
 */
export function bootstrapApplication<T, TArg extends ApplicationArguments>(option: ApplicationOption<T, TArg>): Promise<ApplicationContext<T, TArg>>;
/**
 * bootstrap application.
 * 
 * 根据模块，环境变量启动运行应用程序
 *
 * @param {Type<T>} target target class type.
 * @param {EnvironmentOption} [option] option {@link EnvironmentOption} application run depdences.
 * @returns async returnning instance of {@link ApplicationContext}.
 */
export function bootstrapApplication<T, TArg extends ApplicationArguments>(target: Type<T>, option?: EnvironmentOption<TArg>): Promise<ApplicationContext<T, TArg>>;
export function bootstrapApplication<T, TArg extends ApplicationArguments>(target: any, option?: EnvironmentOption<any>): Promise<ApplicationContext<T, TArg>> {
    return new Application<T, TArg>(option ? { module: target, ...option } as ApplicationOption : target).run();
}

class DynamicModule { }
