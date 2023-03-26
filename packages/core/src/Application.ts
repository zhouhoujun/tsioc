import { isFunction, Type, EMPTY, ProviderType, Injector, Modules, ModuleDef, ModuleMetadata, Class, lang, Scopes, ModuleRef, getModuleType, createModuleRef } from '@tsdi/ioc';
import { ApplicationContext, ApplicationFactory, ApplicationOption, EnvironmentOption, PROCESS_ROOT } from './ApplicationContext';
import { DEFAULTA_PROVIDERS, ROOT_DEFAULT_PROVIDERS } from './providers';
import { ModuleLoader } from './ModuleLoader';
import { DefaultModuleLoader } from './impl/loader';
import { setOptions } from './EndpointService';
import { FilterModule } from './filters/filter.module';


/**
 * application.
 *
 * @export
 * @class Application
 */
export class Application<T extends ApplicationContext = ApplicationContext> {

    private _loads?: Type[];
    /**
     * root module ref.
     */
    readonly root: ModuleRef;
    /**
     * application context.
     */
    protected context!: T;


    constructor(protected target: Type | ApplicationOption, protected loader?: ModuleLoader) {
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
     * @returns instance of {@link ApplicationContext}.
     */
    getContext(): ApplicationContext {
        return this.context
    }

    /**
     * run application.
     *
     * @static
     * @param {ApplicationOption} option option of type {@link ApplicationOption}
     * @returns async returnning instance of {@link ApplicationContext}.
     */
    static run(option: ApplicationOption): Promise<ApplicationContext>
    /**
     * run application.
     *
     * @static
     * @param {Type<T>} target target class type.
     * @param {EnvironmentOption} [option] option {@link EnvironmentOption} application run depdences.
     * @returns async returnning instance of {@link ApplicationContext}.
     */
    static run(target: Type, option?: EnvironmentOption): Promise<ApplicationContext>;
    static run(target: any, option?: EnvironmentOption): Promise<ApplicationContext> {
        return new Application(option ? { module: target, ...option } as ApplicationOption : target).run()
    }

    /**
     * run application of module.
     *
     * @param {...string[]} args
     * @returns {Promise<T>}
     */
    async run(): Promise<T> {
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

    protected createInjector(providers: ProviderType[], option: ApplicationOption) {
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

    protected createModuleRef(container: Injector, option: ApplicationOption) {
        return createModuleRef(this.moduleify(option.module), container, option)
    }

    protected moduleify(module: Type | Class | ModuleMetadata): Type | Class {
        if (isFunction(module)) return module;
        if (module instanceof Class) return module;

        return new Class(DynamicModule, {
            type: DynamicModule,
            ...module,
            module: true,
            imports: module.imports ? getModuleType(module.imports) : [],
            exports: module.exports ? lang.getTypes(module.exports) : [],
            bootstrap: module.bootstrap ? lang.getTypes(module.bootstrap) : null
        } as ModuleDef);
    }

    protected async createContext(): Promise<T> {
        if (!this.context) {
            const target = this.target;
            const root = this.root;
            if (isFunction(target)) {
                const modueRef = root.reflectiveFactory.create(target, root);
                this.context = modueRef.resolve(ApplicationFactory).create(root) as T
            } else {
                const modueRef = root.reflectiveFactory.create(root.moduleType, root);
                if (target.loads) {
                    this._loads = await this.root.get(ModuleLoader, this.loader).register(this.root, target.loads);
                }
                this.context = modueRef.resolve(ApplicationFactory).create(root, target) as T;
            }
        }
        return this.context
    }

    protected prepareContext(ctx: T): any {
        const target = this.target;
        if (!isFunction(target)) {
            if (target.events) {
                setOptions(this.context.eventMulticaster, target.events);
            }
            setOptions(this.context.runners, target);
        }
        const bootstraps = this.root.moduleReflect.getAnnotation<ModuleDef>().bootstrap;
        if (bootstraps && bootstraps.length) {
            bootstraps.forEach((type, order) => {
                ctx.runners.attach(type, { order });
            })
        }
    }

    protected refreshContext(ctx: T): any {
        return ctx.refresh()
    }

    protected callRunners(ctx: ApplicationContext): Promise<void> {
        return ctx.runners.run()
    }

    protected async handleRunFailure(ctx: ApplicationContext, error: Error | any): Promise<void> {
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
