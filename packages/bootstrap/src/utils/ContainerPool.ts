import { MapSet, Token, SymbolType, Registration, IContainer, InjectToken, IContainerBuilder } from '@ts-ioc/core';

/**
 * container pool
 *
 * @export
 * @class ContainerPool
 */
export class ContainerPool {
    protected pools: MapSet<Token<any>, IContainer>;

    constructor(protected containerBuilder: IContainerBuilder) {
        this.pools = new MapSet();
    }

    protected createContainer(): IContainer {
        return this.containerBuilder.create();
    }


    getTokenKey(token: Token<any>): SymbolType<any> {
        if (token instanceof Registration) {
            return token.toString();
        }
        return token;
    }

    isDefault(container: IContainer): boolean {
        return container === this._default;
    }
    hasDefault(): boolean {
        return !!this._default;
    }
    _default: IContainer;

    getDefault(): IContainer {
        if (!this._default) {
            this._default = this.createContainer();
        }
        return this._default;
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

    create(parent?: IContainer): IContainer {
        parent = parent || this.getDefault();
        let container = parent.getBuilder().create();
        this.setParent(container, parent);
        return container;
    }

    setParent(container: IContainer, parent?: IContainer) {
        if (this.isDefault(container)) {
            return;
        }
        // if (!container.parent) {
        if (parent && parent !== container) {
            container.parent = parent;
        } else {
            container.parent = this.getDefault();
        }
        // }
    }
}

export const ContainerPoolToken = new InjectToken<ContainerPool>('ContainerPool');

// /**
//  *  global container pools.
//  */
// export const containerPools = new ContainerPool();
