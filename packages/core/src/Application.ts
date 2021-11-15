import { ModuleLoader, isFunction, Type, EMPTY, ProviderType, Injector, Modules, DestroyCallback } from '@tsdi/ioc';
import { CTX_ARGS, PROCESS_ROOT } from './metadata/tk';
import { ApplicationContext, ApplicationFactory, ApplicationExit, ApplicationOption, BootstrapOption } from './Context';
import { MiddlewareModule } from './middleware';
import { BootLifeScope } from './appfac/lifescope';
import { CoreModule, DEFAULTA_FACTORYS } from './core';
import { ModuleRef } from './module.ref';
import { ModuleFactoryResolver } from './module.factory';


/**
 * application.
 *
 * @export
 * @class Application
 */
export class Application {

    private _destroyed = false;
    private _dsryCbs = new Set<DestroyCallback>();
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
            const providers = (target.platformProviders && target.platformProviders.length) ? [...DEFAULTA_FACTORYS, ...target.platformProviders] : DEFAULTA_FACTORYS;
            target.deps = [...this.getDeps(), ...target.deps || EMPTY];
            target.scope = 'root';
            this.root = this.createInjector(providers, target);
        } else {
            const option = { type: target, deps: this.getDeps(), scope: 'root' };
            this.root = this.createInjector(DEFAULTA_FACTORYS, option);
        }
        this.initRoot();
    }

    protected initRoot() {
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
            const ctx = await this.setup();
            await ctx.injector.platform().getAction(BootLifeScope).execute(ctx);
            ctx.onDestroy(() => this.destroy());
            return ctx;
        } catch (err) {
            const appex = this.context?.injector?.get(ApplicationExit);
            if (appex) {
                appex.exit(err as Error);
            } else {
                const logger = this.context?.getLogManager()?.getLogger();
                logger ? logger.error(err) : console.error(err);
            }
            throw err;
        }
    }

    async setup() {
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

    private _loads?: Type[];
    get loadTypes(): Type[] {
        return this._loads ?? EMPTY;
    }

    protected getDeps(): Modules[] {
        return [CoreModule, MiddlewareModule];
    }

    protected createInjector(providers: ProviderType[], option: ApplicationOption) {
        const container = option.injector ?? Injector.create(providers);
        if (this.loader) {
            container.setValue(ModuleLoader, this.loader);
        }
        if (option.args) {
            container.setValue(CTX_ARGS, option.args);
        }
        if (option.baseURL) {
            container.setValue(PROCESS_ROOT, option.baseURL);
        }
        option.platformDeps && container.use(...option.platformDeps);
        return container.resolve({ token: ModuleFactoryResolver, target: option.type }).resolve(option.type).create(container, option);
    }

    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed;
    }
    /**
    * destory this.
    */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            try {
                this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.destroy());
            } finally {
                this._dsryCbs.clear();
                this.destroying();
            }
        }
    }

    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: DestroyCallback): void {
        this._dsryCbs.add(callback);
    }

    protected destroying() {
        this.context.destroy();
        this.root.parent?.destroy();
        this.root.destroy();
    }
}


