import { isInjector, ClassType, IModuleLoader, IContainer, IInjector, isFunction, ROOT_INJECTOR, Type } from '@tsdi/ioc';
import { ContainerBuilder } from '@tsdi/core';
import { IBootApplication } from './IBootApplication';
import { BootModule } from './BootModule';
import { APPLICATION, BOOTCONTEXT, PROCESS_EXIT } from './tk';
import { ApplicationContext, ApplicationOption, BootOption } from './Context';
import { MiddlewareModule } from './middlewares';
import { BootLifeScope, StartupServiceScope } from './boot/lifescope';
import { createContext } from './boot/ctx';
import { ModuleFactory, ModuleRef } from './modules/ref';


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
    protected root: IInjector;
    private _newCt: boolean;
    /**
     * application context.
     *
     * @type {T}
     * @memberof BootApplication
     */
    protected context: ApplicationContext<T>;

    constructor(public target?: Type<T> | ApplicationOption<T>, protected loader?: IModuleLoader) {
        this.onInit(target);
    }

    protected onInit(target: Type | BootOption) {
        let parent: IInjector;

        if (!isFunction(target) && isInjector(target.injector)) {
            parent = target.injector;
            this.container = parent.getContainer();
        } else {
            parent = this.container = this.createContainer();
        }

        this.container.register(BootModule);

        this.root = parent.getInstance(ModuleFactory).create(isFunction(target) ? target : target.type, parent);
        this.root.setValue(ROOT_INJECTOR, this.root);
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
     * @param {(Type<T> | BootOption)} target
     * @param {(LoadType[] | LoadType | string)} [deps]  application run depdences.
     * @param {...string[]} args
     * @returns {Promise<IBootContext>}
     */
    static run<T>(target: Type<T> | BootOption<T>): Promise<ApplicationContext<T>> {
        return new BootApplication(target).run();
    }

    protected async setup() {
        if (!this.context) {
            const root = this.getRootInjector();
            root.register(MiddlewareModule);
            await root.load();
            this.createRootContext(root);
            this.onContextInit();
        }
        return this.context;
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

    /**
     * bootstrap component, service.
     * @param target 
     * @param args 
     * @returns 
     */
    async bootstrap<T>(target: ClassType<T> | BootOption<T>, args?: string[]): Promise<any> {
        const root = this.getRootInjector();
        const ctx = createContext(root, target, args || this.context.args)
        await root.action().getInstance(StartupServiceScope).execute(ctx);
        return ctx.boot;
    }


    getRootInjector(): IInjector {
        return this.root;
    }

    getContainer(): IContainer {
        return this.container;
    }

    protected createRootContext(root: IInjector) {
        this.context = createContext(root, this.target);
        return this.context;
    }

    protected onContextInit() {
        this.root.setValue(BOOTCONTEXT, this.context);
        this.context.onDestroy(() => {
            this.destroy();
        });
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
        if (this.context && !this.context.destroyed) {
            this.context.destroy();
            this.root.destroy();
            if (this._newCt) {
                this.container.destroy();
            }
        }
    }
}


