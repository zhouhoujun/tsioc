import { LoadType, isArray, isString, isInjector, ClassType, isClassType } from '@tsdi/ioc';
import { IContainerBuilder, ContainerBuilder, IModuleLoader, IContainer, ContainerToken } from '@tsdi/core';
import { RunnableConfigure } from './annotations/RunnableConfigure';
import { BootContext, BootOption, ApplicationContextToken } from './BootContext';
import { AnnotationServiceToken } from './services/IAnnotationService';
import { IBootApplication, ContextInit } from './IBootApplication';
import { BuilderServiceToken } from './builder/IBuilderService';
import { BootModule } from './BootModule';


/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication<T extends BootContext = BootContext> implements IBootApplication, ContextInit<T> {

    /**
     * application context.
     *
     * @type {T}
     * @memberof BootApplication
     */
    protected context: T;

    constructor(public target?: ClassType | BootOption | T, public deps?: LoadType[], protected baseURL?: string, protected loader?: IModuleLoader) {
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
                    container = target.injector.get(ContainerToken);
                }
            }
        }
        if (container) {
            this.container = container;
        } else {
            container = this.getContainer();
        }

        container.register(BootModule);

        if (!container.has(BootContext)) {
            container.register(BootContext);
        }

        container.registerValue(BootApplication, this);

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
        this.container.registerValue(ApplicationContextToken, ctx);
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
        await this.container.load(...this.getBootDeps());
        await this.container.load(...this.getTargetDeps(this.target));
        let ctx = await this.container.resolve(BuilderServiceToken).bootApp(this, ...args);
        return ctx as T;
    }

    private container: IContainer;
    getContainer(): IContainer {
        if (!this.container) {
            this.container = this.createContainerBuilder().create();
        }
        return this.container;
    }

    protected getTargetDeps(target: ClassType | BootOption | T) {
        let dependences = [];
        if (isClassType(target)) {
            let meta = this.container.get(AnnotationServiceToken).getAnnoation(target) as RunnableConfigure;
            if (meta && meta.deps) {
                dependences.push(...meta.deps);
            }
        } else if (target) {
            let options = target instanceof BootContext ? target.getOptions() : target;
            options.deps && dependences.push(...options.deps);
        }
        return dependences;
    }

    protected getBootDeps(): LoadType[] {
        return this.deps;
    }


    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder(this.loader);
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
