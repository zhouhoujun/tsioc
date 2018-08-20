import { MapSet, Token, SymbolType, Registration, IContainer, InjectToken, LoadType } from '@ts-ioc/core';
import { CustomRegister } from './IApplicationBuilder';

/**
 * container pool
 *
 * @export
 * @class ContainerPool
 */
export class ContainerPool {
    protected globalModules: LoadType[];
    protected pools: MapSet<Token<any>, IContainer>;

    constructor() {
        this.pools = new MapSet();
        this.globalModules = [];
    }

    getTokenKey(token: Token<any>): SymbolType<any> {
        if (token instanceof Registration) {
            return token.toString();
        }
        return token;
    }

    /**
     * use global modules.
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof ContainerPool
     */
    use(...modules: LoadType[]): this {
        this.globalModules = this.globalModules.concat(modules);
        this.inited = false;
        return this;
    }


    private inited = false;
    hasInit() {
        return this.inited;
    }

    async initDefault(): Promise<IContainer> {

        let container = this.getDefault();
        if (this.globalModules.length) {
            let usedModules = this.globalModules;
            await container.loadModule(...usedModules);
        }
        this.inited = true;

        return container;
    }

    isDefault(container: IContainer): boolean {
        return container === this.defaults;
    }
    hasDefault(): boolean {
        return !!this.defaults;
    }
    defaults: IContainer;
    setDefault(container: IContainer) {
        this.defaults = container;
    }

    getDefault(): IContainer {
        return this.defaults;
    }

    set(token: Token<any>, container: IContainer) {
        let key = this.getTokenKey(token);
        if (this.pools.has(token)) {
            console.log(`${token.toString()} module has loaded`);
        }
        this.pools.set(token, container);
    }

    get(token: Token<any>): IContainer {
        let key = this.getTokenKey(token);
        if (!this.has(key)) {
            return null;
        }
        return this.pools.get(token);
    }

    has(token: Token<any>): boolean {
        return this.pools.has(this.getTokenKey(token));
    }
}

export const ContainerPoolToken = new InjectToken<ContainerPool>('ContainerPool');

/**
 *  global container pools.
 */
export const containerPools = new ContainerPool();
