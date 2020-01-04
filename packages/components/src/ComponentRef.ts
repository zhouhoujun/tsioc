import { Type, InjectToken, Abstract, isFunction, Singleton } from '@tsdi/ioc';
import { AnnoationContext } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';


export const CTX_COMPONENT = new InjectToken<any>('CTX_COMPONENT')
export const CTX_TEMPLATE_REF = new InjectToken<any | any[]>('CTX_TEMPLATE_REF')
export const CTX_COMPONENT_REF = new InjectToken<IComponentRef>('CTX_COMPONENT_REF')

export interface IDestoryable {
    destroy(): void;
    onDestroy?(callback: () => void): void;
}


export class NodeRef<T> implements IDestoryable {

    protected _destroyed = false;
    private destroyCbs: (() => void)[] = [];
    get destroyed() {
        return this._destroyed;
    }

    private _rootNodes: T[]
    get rootNodes(): T[] {
        return this._rootNodes;
    }

    constructor(public readonly context: AnnoationContext, nodes: T[]) {
        this._rootNodes = nodes;
    }

    destroy(): void {
        if (!this.destroyed) {
            this.rootNodes
                .forEach((node: T & IDestoryable) => {
                    if (node && isFunction(node.destroy)) {
                        node.destroy();
                    }
                });
            delete this._rootNodes;
            this.context.clear();
            this._destroyed = true;
        }
    }

    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }
}


export interface IComponentRef<T = any, TN = any> extends IDestoryable {
    readonly context: AnnoationContext;
    readonly instance: T;
    readonly componentType: Type<T>;
    readonly nodeRef: NodeRef<TN>;
    getNodeSelector(): NodeSelector;
}

export const COMPONENT_REFS = new InjectToken<WeakMap<any, IComponentRef>>('COMPONENT_REFS');


@Abstract()
export abstract class ComponentFactory {
    abstract create<T>(componentType: Type<T>, target: T, context: AnnoationContext, ...nodes: any[]): IComponentRef<T, any>;
}

export class ComponentRef<T = any, TN = any> implements IComponentRef<T, TN> {
    private destroyCbs: (() => void)[] = [];

    private _nodeRef: NodeRef<TN>
    get nodeRef(): NodeRef<TN> {
        return this._nodeRef;
    }
    constructor(
        public readonly componentType: Type<T>,
        public readonly instance: T,
        public readonly context: AnnoationContext,
        nodes: TN[]
    ) {
        if (!context.injector.has(COMPONENT_REFS)) {
            context.injector.registerValue(COMPONENT_REFS, new WeakMap());
        }
        context.injector.get(COMPONENT_REFS).set(instance, this);
        let nodeRef = this._nodeRef = this.createNodeRef(context, nodes);
        context.set(NodeRef, nodeRef);
    }

    protected createNodeRef(context: AnnoationContext, nodes: TN[]) {
        return new NodeRef(context, nodes);
    }

    getNodeSelector(): NodeSelector {
        return new NodeSelector(this.nodeRef);
    }

    destroy(): void {
        if (this.destroyCbs) {
            this.destroyCbs.forEach(fn => fn());
            this.destroyCbs = null;
            !this.nodeRef.destroyed && this.nodeRef.destroy();
            this.context.clear();
        }
    }

    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }
}


@Singleton()
export class DefaultComponentFactory extends ComponentFactory {
    create<T, TN>(componentType: Type<T>, target: T, context: AnnoationContext, ...nodes: TN[]): IComponentRef<T, TN> {
        return new ComponentRef(componentType, target, context, nodes);
    }
}
