import { Token, SymbolType, Registration, InjectToken } from '@ts-ioc/ioc';
import { IContainer, IContainerBuilder } from '@ts-ioc/core';


const RootContainerToken = new InjectToken<IContainer>('__ioc_root_container');
const ParentContainerToken = new InjectToken<IContainer>('__ioc_parent_container');
const ChildrenContainerToken = new InjectToken<IContainer[]>('__ioc_children_container');

/**
 * container pool
 *
 * @export
 * @class ContainerPool
 */
export class ContainerPool {
    protected pools: IContainer[];

    constructor(protected containerBuilder: IContainerBuilder) {
        this.pools = [];
    }

    protected createContainer(parent?: IContainer): IContainer {
        let container = parent ? parent.getBuilder().create() : this.containerBuilder.create();
        this.pools.push(container);
        return container;
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

    has(container: IContainer): boolean {
        return this.pools.indexOf(container) >= 0;
    }

    create(parent?: IContainer): IContainer {
        let container = this.createContainer(parent);
        this.setParent(container, parent);
        return container;
    }

    setParent(container: IContainer, parent?: IContainer) {
        if (this.isDefault(container)) {
            return;
        }
        
        container.bindProvider(RootContainerToken, this._default);
        if (parent && parent !== container) {
            container.bindProvider(ParentContainerToken, parent);

            let children = parent.get(ChildrenContainerToken) || [];
            children.push(container);
            parent.bindProvider(ChildrenContainerToken, children);
        }
    }

    iterator(express: (resolvor?: IContainer) => void | boolean): void | boolean {
        return !this.pools.some(r => {
            if (express(r) === false) {
                return true;
            }
            return false;
        })
    }
}

/**
 *  container pool token.
 */
export const ContainerPoolToken = new InjectToken<ContainerPool>('DI_ContainerPool');
