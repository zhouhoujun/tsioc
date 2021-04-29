import { isArray, isString, isInjector, ClassType, IModuleLoader, IContainer, LoadType, IInjector, isFunction, ROOT_INJECTOR, Container } from '@tsdi/ioc';
import { ContainerBuilder } from '@tsdi/core';
import { IBootApplication } from './IBootApplication';
import { BootModule } from './BootModule';
import { BOOTCONTEXT, BUILDER, PROCESS_EXIT } from './tk';
import { ModuleInjector } from './modules/injector';
import { BootOption, IBootContext } from './Context';
import { MiddlewareModule } from './middlewares';
import { IBuilderService } from './services/IBuilderService';
import { BuilderService } from './services/BuilderService';


/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication<T extends IBootContext = IBootContext> implements IBootApplication {

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
    protected context: T;

    constructor(public target?: ClassType | BootOption, public deps?: LoadType[], protected loader?: IModuleLoader) {
        this.onInit(target);
    }

    protected onInit(target: ClassType | BootOption) {
        this.deps = this.deps || [];
        let container: IContainer;
        let parent: IInjector;

        if (!isFunction(target) && isInjector(target.injector)) {
            parent = target.injector;
            container = parent.getContainer();
        }

        this.container = container ?? this.createContainer();
        this.container.register(BootModule);

        this.root = ModuleInjector.create(parent ?? this.container, true);
        this.root.setValue(ROOT_INJECTOR, this.root);
        this.root.setValue(BootApplication, this);
        this.root.setValue(BUILDER, new BuilderService(this.root), BuilderService);

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

    protected onContextInit(ctx: T) {
        this.root.setValue(BOOTCONTEXT, ctx);
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
        await root.load(this.getBootDeps());
        const build = root.getInstance(BUILDER);
        const ctx = this.createContext(build, args);
        await build.boot(ctx);
        root.get(PROCESS_EXIT)?.(this);
        return ctx as T;
    }


    protected createContext(builer: IBuilderService, args: string[]) {
        const ctx = this.context = builer.createContext(this.target, args) as T;
        this.onContextInit(ctx);
        ctx.onDestroy(() => {
            this.destroy();
        });
        return ctx;
    }

    getRootInjector(): IInjector {
        return this.root;
    }

    getContainer(): IContainer {
        return this.container;
    }

    protected getBootDeps(): LoadType[] {
        return this.deps;
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
            this.root.destroy();
            if (this._newCt) {
                this.container.destroy();
            }
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

