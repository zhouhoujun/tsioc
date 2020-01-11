import { Type, InjectToken, Abstract, isFunction, Singleton, Destoryable, IDestoryable } from '@tsdi/ioc';
import { AnnoationContext } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';

export const CTX_COMPONENT_DECTOR = new InjectToken<string>('CTX_COMPONENT_DECTOR');
export const CTX_COMPONENT = new InjectToken<any>('CTX_COMPONENT');
export const CTX_ELEMENT_REF = new InjectToken<any | any[]>('CTX_ELEMENT_REF');
export const CTX_TEMPLATE_REF = new InjectToken<any | any[]>('CTX_TEMPLATE_REF');
export const CTX_COMPONENT_REF = new InjectToken<ComponentRef>('CTX_COMPONENT_REF');



export class NodeRef<T> extends Destoryable {

    private _rootNodes: T[]
    get rootNodes(): T[] {
        return this._rootNodes;
    }

    constructor(public readonly context: AnnoationContext, nodes: T[]) {
        super();
        this._rootNodes = nodes;
    }

    protected destroying(): void {
        this.rootNodes
            .forEach((node: T & IDestoryable) => {
                if (node && isFunction(node.destroy)) {
                    node.destroy();
                }
            });
        delete this._rootNodes;
        this.context.destroy();
    }
}

export class ElementRef<T> extends Destoryable {

    private _element: T;
    get nativeElement(): T {
        return this._element;
    }

    constructor(public readonly context: AnnoationContext, element: T) {
        super();
        this._element = element;
        let injector = context.injector;
        this.onDestroy(() => injector.get(ELEMENT_REFS)?.delete(element));
    }

    protected destroying(): void {
        let element = this._element as T & IDestoryable;
        if (element && isFunction(element.destroy)) {
            element.destroy();
        }
        delete this._element;
        this.context.destroy();
    }
}

export const COMPONENT_REFS = new InjectToken<WeakMap<any, ComponentRef>>('COMPONENT_REFS');
export const ELEMENT_REFS = new InjectToken<WeakMap<any, ElementRef<any>>>('ELEMENT_REFS');

@Abstract()
export abstract class ComponentFactory {
    abstract create<T>(componentType: Type<T>, target: T, context: AnnoationContext, ...nodes: any[]): ComponentRef<T, any>;
}

export class ComponentRef<T = any, TN = any> extends Destoryable {

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
        super();
        if (!context.injector.has(COMPONENT_REFS)) {
            context.injector.registerValue(COMPONENT_REFS, new WeakMap());
        }
        let injector = context.injector;
        injector.get(COMPONENT_REFS).set(instance, this);
        this.onDestroy(() => injector.get(COMPONENT_REFS)?.delete(this.instance));
        let nodeRef = this._nodeRef = this.createNodeRef(context, nodes);
        context.set(NodeRef, nodeRef);
    }

    protected createNodeRef(context: AnnoationContext, nodes: TN[]) {
        return new NodeRef(context, nodes);
    }

    getNodeSelector(): NodeSelector {
        return new NodeSelector(this.nodeRef);
    }

    protected destroying(): void {
        this.nodeRef.destroy();
        this.context.destroy();
    }
}


@Singleton()
export class DefaultComponentFactory extends ComponentFactory {
    create<T, TN>(componentType: Type<T>, target: T, context: AnnoationContext, ...nodes: TN[]): ComponentRef<T, TN> {
        return new ComponentRef(componentType, target, context, nodes);
    }
}
