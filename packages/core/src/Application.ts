import { ModuleLoader, isFunction, Type, EMPTY, ProviderType, Injector, Modules } from '@tsdi/ioc';
import { PROCESS_ROOT } from './metadata/tk';
import { ApplicationContext, ApplicationFactory, ApplicationOption, EnvironmentOption } from './context';
import { StartupSet } from './startup';
import { ServiceSet } from './service';
import { DEFAULTA_PROVIDERS } from './providers';
import { ModuleRef } from './module.ref';
import { ModuleFactoryResolver } from './module.factory';
import { RunnableSet } from './runnable';
import { ApplicationExit } from './exit';

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
            this.root = this.createInjector(providers, target);
        } else {
            const option = { type: target, deps: this.getDeps(), scope: 'root' };
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
        return new Application(option ? { type: target, ...option } as ApplicationOption : target).run();
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
            await this.configation(ctx);
            this.prepareContext(ctx);
            this.refreshContext(ctx);
            await this.statupServers(ctx.startups);
            await this.statupServices(ctx.services);
            await this.statupRunnable(ctx.runnables);
            await this.bootstraps(this.root.moduleReflect.bootstrap);
            return ctx;
        } catch (err) {
            if (this.context) {
                const logger = this.context.getLogger();
                logger ? logger.error(err) : console.error(err);
                await this.context.destroy();
            } else {
                console.error(err);
            }
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
        return container.resolve({ token: ModuleFactoryResolver, target: option.type }).resolve(option.type).create(container, option);
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
                this.context = root.resolve({ token: ApplicationFactory, target: target.type }).create(root, target) as T;
            }
        }
        return this.context;
    }

    protected async configation(ctx: T): Promise<void> {
    }

    protected prepareContext(ctx: T): void {
    }

    protected refreshContext(ctx: T): void {
        const exit = ctx.injector.get(ApplicationExit);
        if (exit) {
            exit.register();
        }
    }

    protected async statupServers(servers: StartupSet): Promise<void> {
        if (servers?.count) {
            await servers.startup(this.context);
        }
    }

    protected async statupServices(services: ServiceSet): Promise<void> {
        if (services?.count) {
            await services.startup(this.context);
        }
    }

    protected async statupRunnable(runnables: RunnableSet): Promise<void> {
        if (runnables?.count) {
            await runnables.startup(this.context);
        }
    }

    protected async bootstraps(bootstraps?: Type[]): Promise<void> {
        if (bootstraps && bootstraps.length) {
            await Promise.all(bootstraps.map(b => this.context.bootstrap(b)));
        }
    }
}
