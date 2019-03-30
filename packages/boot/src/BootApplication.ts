import { BootContext } from './BootContext';
import {
    Type, LoadType, BindProviderAction, IocSetCacheAction, ComponentBeforeInitAction,
    ComponentInitAction, ComponentAfterInitAction, InjectReference, DesignDecoratorRegisterer,
    RuntimeDecoratorRegisterer, DecoratorScopes, RegisterSingletionAction
} from '@tsdi/ioc';
import { ContainerPool, RegScope, DIModuleRegisterScope } from './core';
import { IContainerBuilder, ContainerBuilder, IModuleLoader, IContainer, ModuleDecoratorRegisterer } from '@tsdi/core';
import { RunnableBuildLifeScope } from './services';
import { Bootstrap } from './decorators';
import * as annotations from './annotations';
import * as runnable from './runnable';
import * as services from './services';
import * as handles from './handles';

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
    public context: BootContext;
    /**
     * application module root container.
     *
     * @type {IContainer}
     * @memberof BootApplication
     */
    public container: IContainer;

    protected pools: ContainerPool;
    protected depModules: LoadType[];
    protected runableScope: RunnableBuildLifeScope;

    constructor(context: Type<any> | BootContext, protected baseURL?: string, protected loader?: IModuleLoader) {
        this.depModules = [];
        this.init(context);
    }

    protected init(context: Type<any> | BootContext) {
        this.context = context instanceof BootContext ? context : this.createContext(context);
        let container: IContainer;
        if (this.context.hasRaiseContainer()) {
            container = this.context.getRaiseContainer();
            if (!this.getPools().hasParent(container)) {
                this.getPools().setParent(container);
            }
        } else {
            container = this.getPools().getRoot();
        }
        this.container = container;
        container.bindProvider(BootApplication, this);
        container.bindProvider(new InjectReference(BootApplication, this.context.type), this);
        container.use(annotations, handles, runnable, services);

        let designReg = container.get(DesignDecoratorRegisterer);
        designReg.register(Bootstrap, DecoratorScopes.Class, BindProviderAction);

        let runtimeReg = container.get(RuntimeDecoratorRegisterer);
        runtimeReg.register(Bootstrap, DecoratorScopes.Class,
            ComponentBeforeInitAction, ComponentInitAction,
            ComponentAfterInitAction, RegisterSingletionAction, IocSetCacheAction);

        container.get(ModuleDecoratorRegisterer)
            .register(Bootstrap, DIModuleRegisterScope);

    }

    /**
     * run module.
     *
     * @static
     * @template T
     * @param {Type<T>} target
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof BootApplication
     */
    static async run<T>(target: Type<T> | BootContext, ...args: string[]): Promise<BootContext> {
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
        this.context.setRaiseContainer(this.container);
        this.context.args = args;
        this.context.regScope = RegScope.boot;
        await this.container.resolve(RunnableBuildLifeScope).execute(this.context);
        return this.context;
    }


    /**
     * use module as global Depdences module.
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof RunnableBuilder
     */
    use(...modules: LoadType[]): this {
        this.depModules = this.depModules.concat(modules);
        return this;
    }

    getPools(): ContainerPool {
        if (!this.pools) {
            this.pools = new ContainerPool(this.createContainerBuilder());
        }
        return this.pools;
    }

    protected createContext(type: Type<any>): BootContext {
        return BootContext.parse(type);
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder(this.loader);
    }

}
