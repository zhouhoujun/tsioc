import { BootContext, BootOption, BootTargetToken } from './BootContext';
import {
    Type, BindProviderAction, IocSetCacheAction, ComponentBeforeInitAction,
    ComponentInitAction, ComponentAfterInitAction, InjectReference, DesignDecoratorRegisterer,
    RuntimeDecoratorRegisterer, DecoratorScopes, RegisterSingletionAction, isClass, Component, ActionRegisterer
} from '@tsdi/ioc';
import { ContainerPool, RegScope, DIModuleRegisterScope, HandleRegisterer } from './core';
import { IContainerBuilder, ContainerBuilder, IModuleLoader, IContainer, ModuleDecoratorRegisterer } from '@tsdi/core';
import { RunnableBuildLifeScope, ModuleBuildDecoratorRegisterer } from './services';
import { Bootstrap } from './decorators';
import * as annotations from './annotations';
import * as runnable from './runnable';
import * as services from './services';
import { BindingScope } from './handles';

/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication {
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

    constructor(protected target: Type<any> | BootOption | BootContext, protected baseURL?: string, protected loader?: IModuleLoader) {
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

        let designReg = this.container.get(DesignDecoratorRegisterer);
        designReg.register(Bootstrap, DecoratorScopes.Class, BindProviderAction);

        let runtimeReg = this.container.get(RuntimeDecoratorRegisterer);
        runtimeReg.register(Bootstrap, DecoratorScopes.Class,
            ComponentBeforeInitAction, ComponentInitAction,
            ComponentAfterInitAction, RegisterSingletionAction, IocSetCacheAction);

        this.container.get(ModuleDecoratorRegisterer)
            .register(Bootstrap, DIModuleRegisterScope);

        this.container
            .get(HandleRegisterer)
            .register(this.container, BindingScope, true);
        this.container.get(ModuleBuildDecoratorRegisterer).register(Component, BindingScope);

    }

    getContext(): BootContext {
        if (!this.context) {
            this.context = this.createContext(this.target);
        }
        return this.context;
    }

    /**
     * run module.
     *
     * @static
     * @template T
     * @param {(Type<T> | BootOption | BootContext)} target
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof BootApplication
     */
    static async run<T>(target: Type<T> | BootOption | BootContext, ...args: string[]): Promise<BootContext> {
        return new BootApplication(target).run(...args);
    }

    /**
     * run application of module.
     *
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof BootApplication
     */
    async run(...args: string[]): Promise<BootContext> {
        let ctx = this.getContext();
        this.initContext(ctx, args);
        await this.container.resolve(RunnableBuildLifeScope).execute(ctx);
        return ctx;
    }

    getPools(): ContainerPool {
        if (!this.pools) {
            this.pools = new ContainerPool(this.createContainerBuilder());
        }
        return this.pools;
    }

    protected createContext(target: Type<any> | BootOption): BootContext {
        let md = isClass(target) ? target : target.module;
        let ctx = this.container.getService(BootContext, md, { provide: BootTargetToken, useValue: md });
        if (!isClass(target)) {
            ctx.setOptions(target);
        }
        return ctx;
    }

    protected initContext(ctx: BootContext, args: string[]) {
        this.container.bindProvider(new InjectReference(BootApplication, this.context.module), this);
        ctx.setRaiseContainer(this.container);
        ctx.args = args;
        ctx.regScope = ctx.regScope || RegScope.boot;
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder(this.loader);
    }

}
