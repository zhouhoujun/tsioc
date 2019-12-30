import { Type, InjectToken, Abstract, isFunction } from '@tsdi/ioc';
import { AnnoationContext } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';



export const CTX_TEMPLATE_REF = new InjectToken<any | any[]>('CTX_TEMPLATE_REF')


@Abstract()
export abstract class NodeRefFactory {
    abstract createRoot<T>(roots: T | T[], context?: AnnoationContext): RootNodeRef<T>
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

    constructor(public rootNodes: T | T[], private context: AnnoationContext) {
        super();
    }

    getContext<TC extends AnnoationContext>(): TC {
        return this.context as TC;
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

export interface IComponentRef<T, TN> {
    readonly context: AnnoationContext;
    readonly instance: T;
    readonly componentType: Type<T>;
    readonly nodeRef: RootNodeRef<TN>
}

export const COMPONENT_REFS = new InjectToken<WeakMap<any, ComponentRef>>('COMPONENT_REFS');


export class ComponentRef<T = any, TN= any> implements IComponentRef<T, TN> {
    private destroyCbs: (() => void)[] = [];

    constructor(
        public readonly componentType: Type<T>,
        public readonly instance: T,
        public readonly context: AnnoationContext,
        public readonly nodeRef: RootNodeRef<TN>
    ) {
        if (!context.injector.has(COMPONENT_REFS)) {
            context.injector.registerValue(COMPONENT_REFS, new WeakMap());
        }
        context.injector.get(COMPONENT_REFS).set(instance, this);
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
