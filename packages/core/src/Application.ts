import { ModuleLoader, isFunction, Type, EMPTY, ProviderType, Injector, Modules } from '@tsdi/ioc';
import { DebugLogAspect, LogConfigureToken, LogModule } from '@tsdi/logs';
import { CONFIGURATION, PROCESS_ROOT } from './metadata/tk';
import { ApplicationContext, ApplicationFactory, ApplicationOption, BootstrapOption } from './context';
import { Disposable, isDisposable } from './dispose';
import { ApplicationArguments, ApplicationExit, ApplicationShutdownHandlers, createShutdown, isShutdown } from './shutdown';
import { ConfigureMergerImpl, DefaultConfigureManager } from './configure/manager';
import { ServerSet } from './server';
import { ClientSet } from './client';
import { ServiceSet } from './service';
import { MiddlewareModule } from './middleware';
import { DEFAULTA_PROVIDERS } from './providers';
import { ModuleRef } from './module.ref';
import { ModuleFactoryResolver } from './module.factory';
import { RunnableSet } from './runnable';


/**
 * application.
 *
 * @export
 * @class Application
 */
export class Application implements Disposable {

    private _loads?: Type[];
    /**
     * root module ref.
     */
    readonly root: ModuleRef;
    /**
     * application context.
     *
     * @type {T}
     * @memberof BootApplication
     */
    protected context!: ApplicationContext;

    constructor(protected target: Type | ApplicationOption, protected loader?: ModuleLoader) {
        if (!isFunction(target)) {
            if (!this.loader) this.loader = target.loader;
            const providers = (target.platformProviders && target.platformProviders.length) ? [...DEFAULTA_PROVIDERS, ...target.platformProviders] : DEFAULTA_PROVIDERS;
            target.deps = target.deps?.length ? [...this.getDeps(), ...target.deps] : this.getDeps();
            target.scope = 'root';
            this.root = this.createInjector(providers, target);
        } else {
            const option = { type: target, deps: this.getDeps(), scope: 'root' };
            this.root = this.createInjector(DEFAULTA_PROVIDERS, option);
        }
        this.initRoot();
    }

    protected initRoot() {
        this.root.register(DefaultConfigureManager, ConfigureMergerImpl);
        this.root.setValue(Application, this);
    }

    /**
     * get boot application context.
     *
     * @returns {ApplicationContext}
     * @memberof BootApplication
     */
    getContext(): ApplicationContext {
        return this.context;
    }

    /**
    * run application.
    *
    * @static
    * @param {ApplicationOption<M>)} target
    * @returns {Promise<ApplicationContext<M>>}
    */
    static run(target: ApplicationOption): Promise<ApplicationContext>
    /**
     * run application.
     *
     * @static
     * @param {Type<T>} target
     * @param {BootstrapOption)} [option]  application run depdences.
     * @returns {Promise<IBootContext>}
     */
    static run(target: Type, option?: BootstrapOption): Promise<ApplicationContext>;
    static run(target: any, option?: BootstrapOption): Promise<ApplicationContext> {
        return new Application(option ? { type: target, ...option } as ApplicationOption : target).run();
    }

    /**
     * run application of module.
     *
     * @param {...string[]} args
     * @returns {Promise<T>}
     */
    async run(): Promise<ApplicationContext> {
        try {
            const ctx = await this.createContext();
            await this.configation(ctx);
            const exit = this.root.get(ApplicationExit);
            if (exit) {
                exit.register();
            }
            await this.statupServers(ctx.servers);
            await this.statupClients(ctx.clients);
            await this.statupServices(ctx.services);
            await this.statupRunnable(ctx.runnables);
            await this.bootstraps(this.root.moduleReflect.bootstrap);
            return ctx;
        } catch (err) {
            if (this.context) {
                const logger = this.context.getLogManager()?.getLogger();
                logger ? logger.error(err) : console.error(err);
                await this.context.dispose();
            } else {
                console.error(err);
            }
            throw err;
        }
    }

    dispose(): Promise<void> {
        return this.context.dispose();
    }

    get loadTypes(): Type[] {
        return this._loads ?? EMPTY;
    }

    protected getDeps(): Modules[] {
        return [MiddlewareModule];
    }

    protected createInjector(providers: ProviderType[], option: ApplicationOption) {
        const container = option.injector ?? Injector.create(providers);
        if (this.loader) {
            container.setValue(ModuleLoader, this.loader);
        }
        if (option.args && option.args.length) {
            container.get(ApplicationArguments)?.reset(option.args);
        }
        if (option.baseURL) {
            container.setValue(PROCESS_ROOT, option.baseURL);
        }
        container.platform().onInstanceCreated((target, inj) => {
            if (isShutdown(target) || isDisposable(target)) {
                const hdrs = inj.get(ApplicationShutdownHandlers);
                if (hdrs && !hdrs.has(target)) {
                    hdrs.add(createShutdown(target));
                }
            }
        });
        option.platformDeps && container.use(...option.platformDeps);
        return container.resolve({ token: ModuleFactoryResolver, target: option.type }).resolve(option.type).create(container, option);
    }

    protected async createContext(): Promise<ApplicationContext> {
        if (!this.context) {
            const target = this.target;
            const root = this.root;
            if (isFunction(target)) {
                this.context = root.resolve({ token: ApplicationFactory, target: target }).create(root);
            } else {
                if (target.loads) {
                    this._loads = await this.root.load(target.loads);
                }
                this.context = root.resolve({ token: ApplicationFactory, target: target.type }).create(root, target);
            }
        }
        return this.context;
    }

    protected async configation(ctx: ApplicationContext): Promise<void> {
        const { baseURL, injector } = ctx;
        const mgr = ctx.getConfigureManager();
        let config = await mgr.getConfig();

        if (config.deps && config.deps.length) {
            await injector.load(config.deps);
        }

        if (config.providers && config.providers.length) {
            injector.inject(config.providers);
        }

        if (!baseURL && config.baseURL) {
            injector.setValue(PROCESS_ROOT, config.baseURL);
        }

        config = { ...config, baseURL, debug: injector.moduleReflect.annotation?.debug };
        injector.setValue(CONFIGURATION, config);

        if (config.logConfig) {
            injector.parent?.setValue(LogConfigureToken, config.logConfig);
            injector.setValue(LogConfigureToken, config.logConfig);
        }
        if (config.debug) {
            // make sure log module registered.
            injector.register(LogModule, DebugLogAspect);
        }
    }

    protected async statupServers(servers: ServerSet): Promise<void> {
        if (servers?.count) {
            await servers.startup(this.context);
        }
    }

    protected async statupClients(clients: ClientSet): Promise<void> {
        if (clients?.count) {
            await clients.startup(this.context);
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
