import { ModuleLoader, Container, isFunction, Type, EMPTY } from '@tsdi/ioc';
import { ContainerBuilder } from '@tsdi/core';
import { IBootApplication } from './IBootApplication';
import { APPLICATION } from './metadata/tk';
import {
    ApplicationContext, ApplicationFactory, ModuleFactory,
    ModuleInjector, ApplicationExit, ApplicationOption, BootstrapOption
} from './Context';
import { MiddlewareModule } from './middlewares';
import { BootLifeScope } from './appl/lifescope';
import { BootModule, DEFAULTA_FACTORYS } from './BootModule';


/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication implements IBootApplication {

    private _destroyed = false;
    private _dsryCbs: (() => void)[] = [];
    protected container: Container;
    private _newCt: boolean;
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
            const parent = target.injector ?? this.createContainer();
            const providers = (target.providers && target.providers.length) ? [...DEFAULTA_FACTORYS, ...target.providers] : DEFAULTA_FACTORYS;
            target.providers = providers;
            target.deps = [BootModule, MiddlewareModule, ...target.deps || EMPTY];
            target.root = true;
            this.root = parent.resolve({ token: ModuleFactory, target: target.type, providers }).create(parent, target);
            this.container = this.root.getContainer();
        } else {
            this.container = this.createContainer();
            const option = { type: target, root: true, deps: [BootModule, MiddlewareModule], providers: DEFAULTA_FACTORYS };
            this.root = this.container.resolve({ token: ModuleFactory, target, providers: DEFAULTA_FACTORYS }).create(this.container, option);
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


    getContainer(): Container {
        return this.container;
    }

    protected createContainer() {
        this._newCt = true;
        return new ContainerBuilder(this.loader).create();
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
        if (this._newCt) {
            this.container.destroy();
        }
    }
}


