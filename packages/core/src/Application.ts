import { ModuleLoader, isFunction, Type, EMPTY, ProviderType, Injector, Modules } from '@tsdi/ioc';
import { PROCESS_ROOT } from './metadata/tk';
import { ApplicationContext, ApplicationFactory, ApplicationOption, EnvironmentOption } from './context';
import { DEFAULTA_PROVIDERS } from './providers';
import { ApplicationExit } from './exit';
import { ModuleRef } from './module.ref';
import { ModuleFactoryResolver } from './module.factory';
import { RunnableFactoryResolver } from './runnable';

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
            const providers = (target.platformProviders && target.platformProviders.length) ? [...this.getDefaultProviders(), ...target.platformProviders] : this.getDefaultProviders();
            target.deps = target.deps?.length ? [...this.getDeps(), ...target.deps] : this.getDeps();
            target.scope = 'root';
            target.isStatic = true;
            this.root = this.createInjector(providers, target);
        } else {
            const option = { module: target, deps: this.getDeps(), scope: 'root', isStatic: true };
            this.root = this.createInjector(this.getDefaultProviders(), option);
        }
        this.initRoot();
    }

    protected getDefaultProviders(): ProviderType[] {
        return DEFAULTA_PROVIDERS;
    }

    protected initRoot() {
        this.root.setValue(Application, this);
    }

    /**
     * get application context.
     *
     * @returns instance of {@link ApplicationContext}.
     */
    getContext(): ApplicationContext {
        return this.context;
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
        return new Application(option ? { module: target, ...option } as ApplicationOption : target).run();
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
            return ctx;
        } catch (err) {
            await this.handleRunFailure(this.context, err);
            throw err;
        }
    }

    get loadTypes(): Type[] {
        return this._loads ?? EMPTY;
    }

    protected getDeps(): Modules[] {
        return [];
    }

    protected createInjector(providers: ProviderType[], option: ApplicationOption) {
        const container = option.injector ?? Injector.create(providers);
        if (option.baseURL) {
            container.setValue(PROCESS_ROOT, option.baseURL);
        }
        if (this.loader) {
            container.setValue(ModuleLoader, this.loader);
        }
        option.platformDeps && container.use(...option.platformDeps);
        return container.resolve({ token: ModuleFactoryResolver, target: option.module }).resolve(option.module).create(container, option);
    }

    protected async createContext(): Promise<T> {
        if (!this.context) {
            const target = this.target;
            const root = this.root;
            if (isFunction(target)) {
                this.context = root.resolve({ token: ApplicationFactory, target: target }).create(root) as T;
            } else {
                if (target.loads) {
                    this._loads = await this.root.load(target.loads);
                }
                this.context = root.resolve({ token: ApplicationFactory, target: target.module }).create(root, target) as T;
            }
        }
        return this.context;
    }

    protected prepareContext(ctx: T): any {
        const bootstraps = this.root.moduleReflect.bootstrap;
        if (bootstraps && bootstraps.length) {
            const injector = ctx.injector;
            bootstraps.forEach(type => {
                const runner = injector.resolve({ token: RunnableFactoryResolver, target: type }).resolve(type).create(injector);
                ctx.runners.addBootstrap(runner);
            });
        }
    }

    protected refreshContext(ctx: T): any {
        const exit = ctx.injector.get(ApplicationExit);
        if (exit) {
            exit.register();
        }
        ctx.refresh();
    }

    protected callRunners(ctx: ApplicationContext): Promise<void> {
        return ctx.runners.run();
    }

    protected async handleRunFailure(ctx: ApplicationContext, error: Error|any): Promise<void> {
        if (ctx) {
            const logger = ctx.getLogger();
            logger ? logger.error(error) : console.error(error);
            await ctx.destroy();
        } else {
            console.error(error);
        }
    }

}
