import { IModuleLoader, IContainer, IInjector, isFunction, Type, createInjector } from '@tsdi/ioc';
import { ContainerBuilder } from '@tsdi/core';
import { IBootApplication } from './IBootApplication';
import { APPLICATION, PROCESS_EXIT } from './tk';
import { ApplicationContext, ApplicationFactory, ApplicationOption, BootOption, BootstrapOption } from './Context';
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
        let parent: IInjector;
        const target = this.target;
        if (!isFunction(target)) {
            this.loader = target.loader;
            parent = createInjector(target.injector ?? this.createContainer(), target.providers);
            this.container = parent.getContainer();
            target.providers = null;
        } else {
            this.container = this.createContainer();
            parent = createInjector(this.container);
        }

        this.container.register(BootModule);

        this.context = parent.getInstance(ApplicationFactory).create(isFunction(target) ? target : target.type, parent);

        this.context.onDestroy(() => {
            parent.destroy();
            this.destroy();
        });
        this.context.setValue(BootApplication, this);
        this.context.setValue(APPLICATION, this);

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
    static run<T>(target: Type<T> | BootOption<T>, option?: BootstrapOption): Promise<ApplicationContext<T>> {
        return new BootApplication(option ? { type: target, ...option } as BootOption<T> : target).run();
    }

    /**
     * run application of module.
     *
     * @param {...string[]} args
     * @returns {Promise<T>}
     */
    async run(): Promise<ApplicationContext<T>> {

        this.context.register(MiddlewareModule);
        if (!isFunction(this.target)) {
            await this.context.load(this.target.deps);
        }

        await this.context.action().getInstance(BootLifeScope).execute(this.context);
        this.context.get(PROCESS_EXIT)?.(this);
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
        if (this._newCt) {
            this.container.destroy();
        }
    }
}


