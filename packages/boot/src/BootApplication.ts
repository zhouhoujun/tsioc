import { BootContext, BootOption } from './BootContext';
import {
    Type, BindProviderAction, IocSetCacheAction, DesignDecoratorRegisterer,
    RuntimeDecoratorRegisterer, DecoratorScopes, RegisterSingletionAction, LoadType, isArray, isString
} from '@tsdi/ioc';
import { ContainerPool, DIModuleRegisterScope } from './core';
import { IContainerBuilder, ContainerBuilder, IModuleLoader, IContainer, ModuleDecoratorRegisterer } from '@tsdi/core';
import { Bootstrap } from './decorators';
import * as annotations from './annotations';
import * as runnable from './runnable';
import * as services from './services';
import { BuilderService } from './services';

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
/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication implements ContextInit {

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

    constructor(public target: Type<any> | BootOption | BootContext, protected baseURL?: string, protected loader?: IModuleLoader) {
        this.onInit(target);
    }

    protected onInit(target: Type<any> | BootOption | BootContext) {
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
        this.container.use(annotations, runnable, services);


        this.container.get(DesignDecoratorRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, BindProviderAction);

        this.container.get(RuntimeDecoratorRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

        this.container.get(ModuleDecoratorRegisterer)
            .register(Bootstrap, DIModuleRegisterScope);

    }

    getContext() {
        return this.context;
    }

    onContextInit(ctx: BootContext) {
        this.context = ctx;
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
        return new BootApplication(target).run(deps, ...args);
    }

    /**
     * run application of module.
     *
     * @param {(LoadType[] | LoadType | string)} [deps]  application run depdences.
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof BootApplication
     */
    async run(deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<BootContext> {
        if (isString(deps)) {
            args.unshift(deps);
        } else if (deps) {
            await this.container.load(...(isArray(deps) ? deps : [deps]));
        }
        return await this.container.resolve(BuilderService).boot(this, ...args);
    }

    getPools(): ContainerPool {
        if (!this.pools) {
            this.pools = new ContainerPool(this.createContainerBuilder());
        }
        return this.pools;
    }


    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder(this.loader);
    }

}
