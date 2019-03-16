import { BootContext } from './BootContext';
import { Type, LoadType, Token } from '@ts-ioc/ioc';
import { ContainerPool } from 'packages/bootstrap/src/ContainerPool';
import { IContainerBuilder, ContainerBuilder, IModuleLoader } from '@ts-ioc/core';
import { RunnableBuildLifeScope } from './services';

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
    constructor(protected token: Token<any>, protected baseURL?: string, protected loader?: IModuleLoader) {
        this.depModules = [];
    }

    static async run<T>(module: Type<T>, ...args: string[]): Promise<BootContext> {
        return new BootApplication(module).run(...args);;
    }

    async run(ctx?: BootContext | string, ...args: string[]): Promise<BootContext> {
        let root = this.getPools().getRoot();
        let bctx: BootContext;
        if (ctx instanceof BootContext) {
            bctx = ctx;
        } else {
            ctx && args.unshift(ctx);
            bctx = this.createContext();
        }
        bctx.setContext(()=> root);
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
        return new BootContext();
    }

    protected createContainerBuilder(): IContainerBuilder {
        return new ContainerBuilder(this.loader);
    }

}
