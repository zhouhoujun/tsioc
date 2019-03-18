import { BootContext } from './BootContext';
import {
    Type, LoadType, DecoratorRegisterer, BindProviderAction, IocGetCacheAction,
    IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction
} from '@ts-ioc/ioc';
import { ContainerPool } from 'packages/bootstrap/src/ContainerPool';
import { IContainerBuilder, ContainerBuilder, IModuleLoader, ModuleInjectorManager } from '@ts-ioc/core';
import { RunnableBuildLifeScope } from './services';
import { Bootstrap } from '@ts-ioc/bootstrap';
import { BootstrapInjector } from './injectors';
import * as annotations from './annotations';
import * as injectors from './injectors';
import * as runnable from './runnable';
import * as services from './services';

/**
 * boot application.
 *
 * @export
 * @class BootApplication
 */
export class BootApplication {
    protected pools: ContainerPool;
    protected depModules: LoadType[];
    protected runableScope: RunnableBuildLifeScope;
    constructor(protected target: Type<any>, protected baseURL?: string, protected loader?: IModuleLoader) {
        this.depModules = [];
        this.init();
    }

    protected init() {
        let container = this.getPools().getRoot();
        container.use(annotations, injectors, runnable, services);
        let decReg = container.get(DecoratorRegisterer);
        decReg.register(Bootstrap, BindProviderAction, IocGetCacheAction,
            IocSetCacheAction, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction);

        container.get(ModuleInjectorManager).use(BootstrapInjector, true);
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
    static async run<T>(target: Type<T>, ctx?: BootContext | string, ...args: string[]): Promise<BootContext> {
        return new BootApplication(target).run(ctx, ...args);
    }

    /**
     * run application of module.
     *
     * @param {(BootContext | string)} [ctx]
     * @param {...string[]} args
     * @returns {Promise<BootContext>}
     * @memberof BootApplication
     */
    async run(ctx?: BootContext | string, ...args: string[]): Promise<BootContext> {
        let root = this.getPools().getRoot();
        let bctx: BootContext;
        if (ctx instanceof BootContext) {
            bctx = ctx;
        } else {
            ctx && args.unshift(ctx);
            bctx = this.createContext();
        }
        bctx.setContext(() => root);
        bctx.args = args;
        await root.resolve(RunnableBuildLifeScope).execute(bctx);
        return bctx;
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

    protected createContext(): BootContext {
        return new BootContext(this.target);
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder(this.loader);
    }

}
