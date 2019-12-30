import { Type, InjectToken, Abstract, isFunction } from '@tsdi/ioc';
import { AnnoationContext } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';


export type NodeType<T = any> = ElementRef | NodeRef<T> | Object;

export const CTX_TEMPLATE_REF = new InjectToken<NodeType | NodeType[]>('CTX_TEMPLATE_REF')


@Abstract()
export abstract class NodeRefFactory {
    abstract createRoot<T>(roots: NodeType<T> | NodeType<T>[], context?: AnnoationContext): RootNodeRef<T>
    abstract create<T>(node: T, context?: AnnoationContext): NodeRef<T>;
}

@Abstract()
export abstract class NodeRef<T = any> {

    protected _destroyed = false;
    private destroyCbs: (() => void)[] = [];
    get destroyed() {
        return this._destroyed;
    }

    constructor(public node?: T) {
    }

    abstract destroy(): void;

    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }
}

export class RootNodeRef<T = any> extends NodeRef<T> {

    constructor(public rootNodes: NodeType<T> | NodeType<T>[], private context: AnnoationContext) {
        super();
    }

    getContext(): AnnoationContext {
        return this.context;
    }

    destroy(): void {
        if (!this.destroyed) {
            let node: any = this.rootNodes;
            if (node && isFunction(node.destroy)) {
                node.destroy();
            }
            this.context.clear();
            delete this.context;
            this._destroyed = true;
        }
    }


}



export class ElementRef<T = any> {
    constructor(public nativeElement: T) {

    }
}

export class IComponentRef<T> {
    readonly context: AnnoationContext;
    readonly instance: T;
    readonly hostView: RootNodeRef<T>;
    readonly componentType: Type<T>;
}

export const COMPONENT_REFS = new InjectToken<WeakMap<any, ComponentRef>>('COMPONENT_REFS');


export class ComponentRef<T = any> implements IComponentRef<T> {
    private destroyCbs: (() => void)[] = [];
    get hostView(): RootNodeRef {
        return this.context.get(RootNodeRef);
    }

    constructor(
        public readonly componentType: Type<T>,
        public readonly instance: T,
        public readonly context: AnnoationContext
    ) {
        if (!context.injector.has(COMPONENT_REFS)) {
            context.injector.registerValue(COMPONENT_REFS, new WeakMap());
        }
        context.injector.get(COMPONENT_REFS).set(instance, this);
    }

    getNodeSelector(): NodeSelector {
        return new NodeSelector(this.hostView);
    }

    destroy(): void {
        if (this.destroyCbs) {
            this.destroyCbs.forEach(fn => fn());
            this.destroyCbs = null;
            !this.hostView.destroyed && this.hostView.destroy();
            this.context.clear();
        }
    }

    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }
}
