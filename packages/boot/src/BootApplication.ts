import { isArray, isString, isInjector, ClassType, IModuleLoader, IContainer, LoadType, IInjector, isFunction } from '@tsdi/ioc';
import { IContainerBuilder, ContainerBuilder } from '@tsdi/core';
import { IBootApplication, ContextInit } from './IBootApplication';
import { BootModule } from './BootModule';
import { BOOTCONTEXT, BUILDER, ROOT_INJECTOR } from './tk';
import { ModuleInjector } from './modules/injector';
import { BootOption, IBootContext } from './Context';
import { MiddlewareModule } from './middlewares';

/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication<T extends IBootContext = IBootContext> implements IBootApplication, ContextInit<T> {

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];
    /**
     * application context.
     *
     * @type {T}
     * @memberof BootApplication
     */
    protected context: T;

    constructor(public target?: ClassType | BootOption, public deps?: LoadType[], protected loader?: IModuleLoader) {
        this.onInit(target);
    }

    protected onInit(target: ClassType | BootOption) {
        this.deps = this.deps || [];
        let container: IContainer;

        if (!isFunction(target)) {
            if (isInjector(target.injector)) {
                container = target.injector.getContainer();
            }
        }

        if (container) {
            this.container = container;
        } else {
            container = this.getContainer();
        }


        if (!this.container.has(ROOT_INJECTOR)) {
            this.container.setValue(ROOT_INJECTOR, ModuleInjector.create(this.container));
        }
        container.setValue(BootApplication, this);
        container.register(BootModule);

    }

    /**
     * get boot application context.
     *
     * @returns {T}
     * @memberof BootApplication
     */
    getContext(): T {
        return this.context;
    }

    onContextInit(ctx: T) {
        this.context = ctx;
        this.bindContextToken(ctx);
    }

    protected bindContextToken(ctx: T) {
        this.getContainer().setValue(BOOTCONTEXT, ctx);
    }

    /**
     * run application.
     *
     * @static
     * @template T
     * @param {(ClassType<T> | BootOption)} target
     * @param {(LoadType[] | LoadType | string)} [deps]  application run depdences.
     * @param {...string[]} args
     * @returns {Promise<IBootContext>}
     */
    static run<T>(target: ClassType<T> | BootOption, deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<IBootContext> {
        let { deps: dep, args: arg } = checkBootArgs(deps, ...args);
        return new BootApplication(target, dep).run(...arg);
    }

    /**
     * run application of module.
     *
     * @param {...string[]} args
     * @returns {Promise<T>}
     */
    async run(...args: string[]): Promise<T> {
        const root = this.getRootInjector();
        root.register(MiddlewareModule);
        await root.load(...this.getBootDeps());
        let ctx = await root.getInstance(BUILDER).boot(this, ...args);
        return ctx as T;
    }

    getRootInjector(): IInjector {
        return this.container.get(ROOT_INJECTOR);
    }

    private container: IContainer;
    getContainer(): IContainer {
        if (!this.container) {
            this.container = this.createContainerBuilder().create();
        }
        return this.container;
    }

    protected getBootDeps(): LoadType[] {
        return this.deps;
    }


    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder(this.loader);
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
            this.destroyCbs = [];
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
            this.container.destroy();
        }
    }

}


/**
 * check boot args.
 *
 * @export
 * @param {(LoadType[] | LoadType | string)} [deps]
 * @param {...string[]} args
 * @returns {{ args: string[], deps: LoadType[] }}
 */
export function checkBootArgs(deps?: LoadType[] | LoadType | string, ...args: string[]): { args: string[], deps: LoadType[] } {
    let mdeps: LoadType[] = [];
    if (isString(deps)) {
        args.unshift(deps);
    } else if (deps) {
        mdeps = isArray(deps) ? deps : [deps];
    }
    return {
        args: args,
        deps: mdeps
    }
}
