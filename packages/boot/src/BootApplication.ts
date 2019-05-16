import { BootContext, BootOption } from './BootContext';
import { Type, LoadType, isArray, isString, InjectReference, isClass, MetadataService, getOwnTypeMetadata } from '@tsdi/ioc';
import { ContainerPool } from './core';
import { IContainerBuilder, ContainerBuilder, IModuleLoader, IContainer } from '@tsdi/core';
import { BuilderService } from './builder';
import { IBootApplication } from './IBootApplication';
import { bootSetup } from './setup';
import { RunnableConfigure } from './annotations';

/**
 * boot application hooks.
 *
 * @export
 * @interface ContextInit
 */
export interface ContextInit {
    /**
     * on context init.
     *
     * @param {BootContext} ctx
     * @memberof ContextInit
     */
    onContextInit(ctx: BootContext);
}

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
/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication implements IBootApplication, ContextInit {

    /**
     * application context.
     *
     * @type {BootContext}
     * @memberof BootApplication
     */
    private context: BootContext;
    /**
     * application module root container.
     *
     * @type {IContainer}
     * @memberof BootApplication
     */
    public container: IContainer;

    protected pools: ContainerPool;

    constructor(public target: Type<any> | BootOption | BootContext, public deps?: LoadType[], protected baseURL?: string, protected loader?: IModuleLoader) {
        this.onInit(target);
    }

    protected onInit(target: Type<any> | BootOption | BootContext) {
        this.deps = this.deps || [];
        if (target instanceof BootContext) {
            this.context = target;
            if (this.context.hasRaiseContainer()) {
                this.container = this.context.getRaiseContainer();
                if (!this.getPools().hasParent(this.container)) {
                    this.getPools().setParent(this.container);
                }
            } else {
                this.container = this.getPools().getRoot();
                this.context.setRaiseContainer(this.container);
            }
            this.container.register(BootContext);
        } else {
            this.container = this.getPools().getRoot();
            this.container.register(BootContext);
        }

        this.container.bindProvider(BootApplication, this);
        bootSetup(this.container);

    }

    getContext(): BootContext {
        return this.context;
    }

    onContextInit(ctx: BootContext) {
        this.context = ctx;
        this.container.bindProvider(new InjectReference(BootApplication, ctx.module), this);
    }

    /**
     * run application.
     *
     * @static
     * @template T
     * @param {(Type<T> | BootOption | BootContext)} target
     * @param {(LoadType[] | LoadType | string)} [deps]  application run depdences.
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof BootApplication
     */
    static run<T>(target: Type<T> | BootOption | BootContext, deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<BootContext> {
        let mdargs = checkBootArgs(deps, ...args);
        return new BootApplication(target, mdargs.deps).run(...mdargs.args);
    }

    /**
     * run application of module.
     *
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof BootApplication
     */
    async run(...args: string[]): Promise<BootContext> {
        return await this.container.resolve(BuilderService).boot(this, ...args);
    }

    getPools(): ContainerPool {
        if (!this.pools) {
            this.pools = new ContainerPool(this.createContainerBuilder());
        }
        return this.pools;
    }

    getBootDeps(): LoadType[] {
        let dependences = [...this.deps];
        if (isClass(this.target)) {
            let target = this.target;
            this.container.get(MetadataService)
                .getClassDecorators(target)
                .forEach(d => {
                    let metas = getOwnTypeMetadata<RunnableConfigure>(d, target);
                    if (metas && metas.length) {
                        metas.filter(m => m && m.deps && m.deps.length > 0)
                            .forEach(m => {
                                dependences.push(...m.deps);
                            });
                    }
                });
        } else if (this.target.deps) {
            dependences.push(...this.target.deps);
        }
        return dependences;
    }


    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder(this.loader);
    }

}
