import { isFunction, Type, EMPTY, ProviderType, Injector, Modules, ModuleDef, ModuleMetadata, Class, lang, Scopes, ModuleRef, getModuleType, createModuleRef } from '@tsdi/ioc';
import { ApplicationContext, ApplicationFactory, ApplicationOption, EnvironmentOption, PROCESS_ROOT } from './ApplicationContext';
import { DEFAULTA_PROVIDERS, ROOT_DEFAULT_PROVIDERS } from './providers';
import { ModuleLoader } from './ModuleLoader';
import { DefaultModuleLoader } from './impl/loader';
import { setOptions } from './EndpointService';
import { FilterModule } from './filters/filter.module';
import { ApplicationArguments } from './ApplicationArguments';


/**
 * application.
 *
 * @export
 * @class Application
 */
export class Application<T, TArg extends ApplicationArguments = any> {

    private _loads?: Type[];
    /**
     * root module ref.
     */
    readonly root: ModuleRef;
    /**
     * application context.
     */
    protected context!: ApplicationContext<T, TArg>;


    constructor(protected target: Type<T> | ApplicationOption<T, TArg>, protected loader?: ModuleLoader) {
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
    getContext(): ApplicationContext<T, TArg> {
        return this.context
    }

    /**
     * run application.
     *
     * @static
     * @param {ApplicationOption} option option of type {@link ApplicationOption}
     * @returns async returnning instance of {@link ApplicationContext}.
     */
    static run<T, TArg extends ApplicationArguments>(option: ApplicationOption<T, TArg>): Promise<ApplicationContext<T, TArg>>
    /**
     * run application.
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
                this.context = modueRef.resolve(ApplicationFactory).create(root, target);
            }
        }
        return this.context
    }

    protected prepareContext(ctx: ApplicationContext<T, TArg>): any {
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
