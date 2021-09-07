import { ModuleLoader, isFunction, Type, EMPTY, Injector, ProviderType, Modules } from '@tsdi/ioc';
import { IBootApplication } from './IBootApplication';
import { APPLICATION, CTX_ARGS, PROCESS_ROOT } from './metadata/tk';
import {
    ApplicationContext, ApplicationFactory, ModuleFactory,
    ModuleInjector, ApplicationExit, ApplicationOption, BootstrapOption
} from './Context';
import { MiddlewareModule } from './middlewares';
import { BootLifeScope } from './appl/lifescope';
import { BootModule, DEFAULTA_FACTORYS } from './BootModule';
import { createModuleInjector } from '.';


/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication implements IBootApplication {

    private _destroyed = false;
    private _dsryCbs: (() => void)[] = [];
    readonly root: ModuleInjector;
    /**
     * application context.
     *
     * @type {T}
     * @memberof BootApplication
     */
    protected context: ApplicationContext;

    constructor(protected target?: Type | ApplicationOption, protected loader?: ModuleLoader) {
        if (!isFunction(target)) {
            if (!this.loader) this.loader = target.loader;
            const providers = (target.providers && target.providers.length) ? [...DEFAULTA_FACTORYS, ...target.providers] : DEFAULTA_FACTORYS;
            target.deps = [BootModule, MiddlewareModule, ...target.deps || EMPTY];
            this.root = this.createInjector(providers, target);
        } else {
            const option = { type: target, deps: [BootModule, MiddlewareModule] };
            this.root = this.createInjector(DEFAULTA_FACTORYS, option);
        }
        this.initRoot();
    }

    initRoot() {
        this.root.setValue(BootApplication, this);
        this.root.setValue(APPLICATION, this);
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
    static run(target: Type | ApplicationOption, option?: BootstrapOption): Promise<ApplicationContext> {
        return new BootApplication(option ? { type: target, ...option } as ApplicationOption : target).run();
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
            await ctx.injector.action().get(BootLifeScope).execute(ctx);
            ctx.onDestroy(() => this.destroy());
            return ctx;
        } catch (err) {
            const appex = this.context.injector.get(ApplicationExit);
            if (appex) {
                appex.exit(err);
            } else {
                const logger = this.context.getLogManager()?.getLogger();
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
                if (target.loads) await this.root.load(target.loads);
                this.context = root.resolve({ token: ApplicationFactory, target: target.type }).create(root, target);
            }
        }
        return this.context;
    }

    protected createInjector(providers: ProviderType[], option: ApplicationOption) {
        const root = createModuleInjector(option.type, providers, option.injector, option);
        if (this.loader) {
            root.setValue(ModuleLoader, this.loader);
        }
        if (option.args) {
            root.setValue(CTX_ARGS, option.args);
        }
        if (option.baseURL) {
            root.setValue(PROCESS_ROOT, option.baseURL);
        }

        return root.resolve({ token: ModuleFactory, target: option.type }).create(root, option);
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
            this._dsryCbs.forEach(cb => cb());
            this._dsryCbs = null;
            this.destroying();
        }
    }

    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        this._dsryCbs?.unshift(callback);
    }

    protected destroying() {
        if (!this.context || !this.context.destroyed) return;

        this.context.destroy();
        this.root.destroy();
    }
}


