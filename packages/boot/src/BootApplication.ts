import { IModuleLoader, IContainer, IInjector, isFunction, Type, createInjector } from '@tsdi/ioc';
import { ContainerBuilder } from '@tsdi/core';
import { IBootApplication } from './IBootApplication';
import { APPLICATION, PROCESS_EXIT } from './tk';
import { ApplicationContext, ApplicationFactory, ApplicationOption, BootstrapOption } from './Context';
import { MiddlewareModule } from './middlewares';
import { BootLifeScope } from './appl/lifescope';
import { BootModule } from './BootModule';


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
    private _parent: IInjector;
    /**
     * application context.
     *
     * @type {T}
     * @memberof BootApplication
     */
    protected context: ApplicationContext<T>;

    constructor(public target?: Type<T> | ApplicationOption<T>, protected loader?: IModuleLoader) {
        this.onInit();
    }

    protected onInit() {
        const target = this.target;
        if (!isFunction(target)) {
            this.loader = target.loader;
            this._parent = createInjector(target.injector ?? this.createContainer(), target.providers);
            this.container = this._parent.getContainer();
            target.providers = null;
        } else {
            this.container = this.createContainer();
            this._parent = createInjector(this.container);
        }

        this.container.register(BootModule);
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
        await ctx.action().getInstance(BootLifeScope).execute(ctx);
        ctx.get(PROCESS_EXIT)?.(this);
        return ctx;
    }

    async setup() {
        if (!this.context) {
            const target = this.target;
            const parent = this._parent;
            if (isFunction(target)) {
                this.context = parent.getInstance(ApplicationFactory).create(target, parent);
            } else {
                this.context = parent.getInstance(ApplicationFactory).create(target, parent);
                await this.context.load(target.deps);
            }
            this.context.register(MiddlewareModule);
            this.context.onDestroy(() => this.destroy());
            this.context.setValue(BootApplication, this);
            this.context.setValue(APPLICATION, this);
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
        this.context.destroy();
        this._parent.destroy();
        if (this._newCt) {
            this.container.destroy();
        }
    }
}


