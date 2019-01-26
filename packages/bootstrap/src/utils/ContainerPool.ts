import {
    Token, SymbolType, Registration,
    IContainer, InjectToken, IContainerBuilder, isArray
} from '@ts-ioc/core';


const rootContainer = '__ioc_root_container';
/**
 * container pool
 *
 * @export
 * @class ContainerPool
 */
export class ContainerPool {
    protected pools: Map<Token<any>, IContainer[]>;

    constructor(protected containerBuilder: IContainerBuilder) {
        this.pools = new Map();
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
            this.pools.set(rootContainer, [this._default]);
        }
        return this._default;
    }

    set(token: Token<any>, container: IContainer) {
        let key = this.getTokenKey(token);
        if (this.pools.has(key)) {
            this.pools.get(key).push(container);
        } else {
            this.pools.set(key, [container]);
        }
    }

    get(token: Token<any>): IContainer[] {
        let key = this.getTokenKey(token);
        if (!this.has(key)) {
            return null;
        }
        return this.pools.get(token);
    }

    has(token: Token<any>): boolean {
        return this.pools.has(this.getTokenKey(token));
    }

    create(token: Token<any>, parent?: IContainer): IContainer {
        parent = parent || this.getDefault();
        let container = parent.getBuilder().create();
        this.setParent(container, parent);
        this.set(token, container);
        return container;
    }

    setParent(container: IContainer, parent?: IContainer) {
        if (this.isDefault(container)) {
            return;
        }
        parent = parent || this.getDefault()
        if (parent && parent !== container) {
            if (container.parent) {
                container.parent.children.splice(container.parent.children.indexOf(container), 1);
            }
            parent.children.push(container);
            container.parent = parent;
        }
    }

    keys(): Token<any>[] {
        return Array.from(this.pools.keys());
    }

    values(): IContainer[] {
        return Array.from(this.pools.values()).reduce((p, c) => p.concat(c), []);
    }

    iterator(express: (resolvor?: IContainer) => void, root?: IContainer): void {
        root = root || this.getDefault();
        express(root);
        this.iteratorChildren(express, root.children);
    }

    protected iteratorChildren(express: (resolvor?: IContainer) => void, children: IContainer[]) {
        if (children && children.length) {
            children.forEach(c => {
                express(c);
                this.iteratorChildren(express, c.children);
            });
        }
    }
}

/**
 *  container pool token.
 */
export const ContainerPoolToken = new InjectToken<ContainerPool>('DI_ContainerPool');
