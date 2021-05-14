import { IModuleLoader, IContainer, isFunction, Type } from '@tsdi/ioc';
import { ContainerBuilder } from '@tsdi/core';
import { IBootApplication } from './IBootApplication';
import { APPLICATION, PROCESS_EXIT } from './tk';
import { ApplicationContext, ApplicationFactory, ApplicationOption, BootstrapOption, ModuleFactory, ModuleInjector } from './Context';
import { MiddlewareModule } from './middlewares';
import { BootLifeScope } from './appl/lifescope';
import { BootModule, DEFAULTA_FACTORYS } from './BootModule';


/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication<T> implements IBootApplication<T> {

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];
    protected container: IContainer;
    private _newCt: boolean;
    readonly root: ModuleInjector<T>;
    /**
     * application context.
     *
     * @type {T}
     * @memberof BootApplication
     */
    protected context: ApplicationContext<T>;

    constructor(public target?: Type<T> | ApplicationOption<T>, protected loader?: IModuleLoader) {
        if (!isFunction(target)) {
            if (!this.loader) this.loader = target.loader;
            const parent = target.injector ?? this.createContainer();
            const prds = (target.providers && target.providers.length) ? [...DEFAULTA_FACTORYS, ...target.providers] : DEFAULTA_FACTORYS;
            target.providers = prds;
            target.deps = [BootModule, MiddlewareModule, ...target.deps || []];
            this.root = parent.resolve(ModuleFactory, ...prds).create(target, parent, true);
            this.container = this.root.getContainer();
        } else {
            this.container = this.createContainer();
            this.root = this.container.resolve(ModuleFactory, ...DEFAULTA_FACTORYS).create({ type: target, deps: [BootModule, MiddlewareModule], providers: DEFAULTA_FACTORYS }, this.container, true);
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
     * @returns {ApplicationContext<T>}
     * @memberof BootApplication
     */
    getContext(): ApplicationContext<T> {
        return this.context;
    }

    /**
    * run application.
    *
    * @static
    * @template T
    * @param {ApplicationOption<T>)} target
    * @returns {Promise<ApplicationContext<T>>}
    */
    static run<T>(target: ApplicationOption<T>): Promise<ApplicationContext<T>>
    /**
     * run application.
     *
     * @static
     * @template T
     * @param {Type<T>} target
     * @param {BootstrapOption)} [option]  application run depdences.
     * @returns {Promise<IBootContext>}
     */
    static run<T>(target: Type<T>, option?: BootstrapOption): Promise<ApplicationContext<T>>;
    static run<T>(target: Type<T> | ApplicationOption<T>, option?: BootstrapOption): Promise<ApplicationContext<T>> {
        return new BootApplication(option ? { type: target, ...option } as ApplicationOption<T> : target).run();
    }

    /**
     * run application of module.
     *
     * @param {...string[]} args
     * @returns {Promise<T>}
     */
    async run(): Promise<ApplicationContext<T>> {
        const ctx = await this.setup();
        await ctx.injector.action().getInstance(BootLifeScope).execute(ctx);
        ctx.onDestroy(() => this.destroy());
        ctx.injector.get(PROCESS_EXIT)?.(this);
        return ctx;
    }

    async setup() {
        if (!this.context) {
            const target = this.target;
            const root = this.root;
            if (isFunction(target)) {
                this.context = root.getInstance(ApplicationFactory).create(this.root);
            } else {
                if (target.loads) await this.root.load(target.loads);
                this.context = root.getInstance(ApplicationFactory).create(root, target);
            }
        }
        return this.context;
    }


    getContainer(): IContainer {
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
            this.destroyCbs.forEach(cb => cb());
            this.destroyCbs = null;
            this.destroying();
        }
    }

    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }

    protected destroying() {
        if (!this.context || !this.context.destroyed) return;

        this.context.destroy();
        if (this._newCt) {
            this.container.destroy();
        }
    }
}


