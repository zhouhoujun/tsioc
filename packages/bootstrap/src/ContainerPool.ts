import { MapSet, Token, Registration, IContainer, InjectToken } from '@ts-ioc/core';

/**
 * container pool
 *
 * @export
 * @class ContainerPool
 */
export class ContainerPool {

    protected pools: MapSet<Token<any>, IContainer>;

    constructor() {
        this.pools = new MapSet();
    }

    getTokenKey(token: Token<any>) {
        if (token instanceof Registration) {
            return token.toString();
        }
        return token;
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

    get(token: Token<any>) {
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
