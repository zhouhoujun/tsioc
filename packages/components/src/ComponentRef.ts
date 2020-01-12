import { Type, InjectToken, Abstract, isFunction, Singleton, Destoryable, IDestoryable } from '@tsdi/ioc';
import { AnnoationContext, CTX_TEMPLATE } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';

export const CTX_COMPONENT_DECTOR = new InjectToken<string>('CTX_COMPONENT_DECTOR');
export const CTX_COMPONENT = new InjectToken<any>('CTX_COMPONENT');
export const CTX_ELEMENT_REF = new InjectToken<any | any[]>('CTX_ELEMENT_REF');
export const CTX_TEMPLATE_REF = new InjectToken<any | any[]>('CTX_TEMPLATE_REF');
export const CTX_COMPONENT_REF = new InjectToken<ComponentRef>('CTX_COMPONENT_REF');

export const COMPONENT_REFS = new InjectToken<WeakMap<any, ComponentRef>>('COMPONENT_REFS');
export const ELEMENT_REFS = new InjectToken<WeakMap<any, ElementRef<any>>>('ELEMENT_REFS');

export class ContextNode extends Destoryable {
    private _context: AnnoationContext;
    get context(): AnnoationContext {
        return this._context;
    }

    constructor(context: AnnoationContext) {
        super();
        this._context = context;
    }

    protected destroying(): void {
        this._context.destroy();
        this._context = null;
    }
}

export type NodeType<T> = ElementRef<T> | NodeRef<T> | ComponentRef<T>;

export class NodeRef<T = any> extends ContextNode {

    private _rootNodes: NodeType<T>[]
    get rootNodes(): NodeType<T>[] {
        return this._rootNodes;
    }

    constructor(context: AnnoationContext, nodes: NodeType<T>[]) {
        super(context);
        this._rootNodes = nodes;
    }

    protected destroying(): void {
        this.rootNodes
            .forEach((node: IDestoryable) => {
                if (node && isFunction(node.destroy)) {
                    node.destroy();
                }
            });
        delete this._rootNodes;
        super.destroy();
    }
}

export class ElementRef<T = any> extends ContextNode {

    private _element: T;
    get nativeElement(): T {
        return this._element;
    }

    constructor(context: AnnoationContext, element: T) {
        super(context);
        this._element = element;
        let injector = context.injector;
        if (!injector.has(ELEMENT_REFS)) {
            injector.registerValue(ELEMENT_REFS, new WeakMap());
        }
        injector.get(ELEMENT_REFS).set(element, this);
        this.onDestroy(() => injector.get(ELEMENT_REFS)?.delete(element));
    }

    protected destroying(): void {
        let element = this._element as T & IDestoryable;
        if (element && isFunction(element.destroy)) {
            element.destroy();
        }
        this._element = null;
        super.destroy();
    }
}


export class TemplateRef<T = any> extends NodeRef<T> {
    get template() {
        return this.context.get(CTX_TEMPLATE);
    }
}

export class ComponentRef<T = any, TN = any> extends ContextNode {

    private _nodeRef: TemplateRef<TN>
    get nodeRef(): TemplateRef<TN> {
        return this._nodeRef;
    }

    private _componentType: Type<T>;
    get componentType(): Type<T> {
        return this._componentType;
    }

    private _instance: T;
    get instance(): T {
        return this._instance;
    }

    constructor(
        componentType: Type<T>,
        instance: T,
        context: AnnoationContext,
        tempRef: TemplateRef<TN>
    ) {
        super(context);
        this._componentType = componentType;
        this._instance = instance;
        this._nodeRef = tempRef;
        if (!context.injector.has(COMPONENT_REFS)) {
            context.injector.registerValue(COMPONENT_REFS, new WeakMap());
        }
        let injector = context.injector;
        injector.get(COMPONENT_REFS).set(instance, this);
        this.onDestroy(() => injector.get(COMPONENT_REFS)?.delete(this.instance));
    }

    getNodeSelector(): NodeSelector {
        return new NodeSelector(this.nodeRef);
    }

    protected destroying(): void {
        this.nodeRef.destroy();
        this._instance = null;
        this._componentType = null;
        this._nodeRef = null;
        super.destroying();
    }
}

