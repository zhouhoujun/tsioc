import { isArray, isString, isInjector, ClassType, isClassType, Destoryable, isDefined } from '@tsdi/ioc';
import { LoadType, IContainerBuilder, ContainerBuilder, IModuleLoader, IContainer, ICoreInjector } from '@tsdi/core';
import { BootContext } from './boot/ctx';
import { IBootApplication, ContextInit } from './IBootApplication';
import { BootModule } from './BootModule';
import { BOOTCONTEXT, BuilderServiceToken, ROOT_INJECTOR } from './tk';
import { ModuleInjector } from './modules/injector';
import { BootOption } from './Context';
import { ApplicationExit } from './services/exit';


/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication<T extends BootContext = BootContext> extends Destoryable implements IBootApplication, ContextInit<T> {

    /**
     * application context.
     *
     * @type {T}
     * @memberof BootApplication
     */
    protected context: T;

    constructor(public target?: ClassType | BootOption | T, public deps?: LoadType[], protected loader?: IModuleLoader) {
        super()
        this.onInit(target);
    }

    protected onInit(target: ClassType | BootOption | T) {
        this.deps = this.deps || [];
        let container: IContainer;
        if (target) {
            if (target instanceof BootContext) {
                this.context = target;
                container = this.context.getContainer();
            } else if (!isClassType(target)) {
                if (isInjector(target.injector)) {
                    container = target.injector.getContainer();
                }
            }
        }
        if (container) {
            this.container = container;
        } else {
            container = this.getContainer();
        }

        container.registerType(BootModule);

        if (!container.has(BootContext)) {
            container.registerType(BootContext);
        }

        if (!this.container.has(ROOT_INJECTOR)) {
            this.container.setValue(ROOT_INJECTOR, this.container.get(ModuleInjector));
        }
        container.setValue(BootApplication, this);

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
     * @param {(ClassType<T> | BootOption | BootContext)} target
     * @param {(LoadType[] | LoadType | string)} [deps]  application run depdences.
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof BootApplication
     */
    static run<T>(target: ClassType<T> | BootOption | BootContext, deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<BootContext> {
        let { deps: dep, args: arg } = checkBootArgs(deps, ...args);
        return new BootApplication(target, dep).run(...arg);
    }

    /**
     * run application of module.
     *
     * @param {...string[]} args
     * @returns {Promise<T>}
     * @memberof BootApplication
     */
    async run(...args: string[]): Promise<T> {
        try {
            const root = this.getRootInjector();
            await root.load(...this.getBootDeps());
            const ctx = await root.getInstance(BuilderServiceToken).bootApp(this, ...args);
            return ctx as T;
        } catch (err) {
            console.error(err);
            const appExit = this.context.injector.get(ApplicationExit);
            if (appExit && appExit.enable) {
                appExit.exit(this.context, err);
            }
            throw err;
        }

    }

    getRootInjector(): ICoreInjector {
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

    protected destroying() {
        this.getContext()?.destroy();
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
