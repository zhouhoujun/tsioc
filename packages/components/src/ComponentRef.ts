import { Type, InjectToken, isFunction, Destoryable, IDestoryable } from '@tsdi/ioc';
import { AnnoationContext, CTX_TEMPLATE } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';

export const CTX_COMPONENT_DECTOR = new InjectToken<string>('CTX_COMPONENT_DECTOR');
export const CTX_COMPONENT = new InjectToken<any>('CTX_COMPONENT');
export const CTX_ELEMENT_REF = new InjectToken<any | any[]>('CTX_ELEMENT_REF');
export const CTX_TEMPLATE_REF = new InjectToken<any | any[]>('CTX_TEMPLATE_REF');
export const CTX_COMPONENT_REF = new InjectToken<ComponentRef>('CTX_COMPONENT_REF');

export const COMPONENT_REFS = new InjectToken<WeakMap<any, IComponentRef<any, any>>>('COMPONENT_REFS');
export const ELEMENT_REFS = new InjectToken<WeakMap<any, IElementRef<any>>>('ELEMENT_REFS');


export interface IContextNode<TCtx extends AnnoationContext = AnnoationContext> extends IDestoryable {
    readonly context: TCtx;
}


export class ContextNode<TCtx extends AnnoationContext = AnnoationContext> extends Destoryable {
    private _context: TCtx;
    get context(): TCtx {
        return this._context;
    }

    constructor(context: TCtx) {
        super();
        this._context = context;
    }

    protected destroying(): void {
        this._context.destroy();
        this._context = null;
    }
}

/**
 *  element type.
 */
export interface IElement {
    destroy?();
}

export interface IElementRef<T = any, TCtx extends AnnoationContext = AnnoationContext> extends IContextNode<TCtx> {
    readonly nativeElement: T;
}

export interface INodeRef<T = any, TCtx extends AnnoationContext = AnnoationContext> extends IContextNode<TCtx> {
    readonly rootNodes: T[];
}

export interface ITemplateRef<T = any, TCtx extends AnnoationContext = AnnoationContext> extends INodeRef<T, TCtx> {
    readonly template: any;
}

export interface IComponentRef<T = any, TN = NodeType, TCtx extends AnnoationContext = AnnoationContext> extends IContextNode<TCtx> {
    readonly componentType: Type<T>;
    readonly instance: T;
    readonly nodeRef: ITemplateRef<TN>;
    getNodeSelector(): NodeSelector;
}

export type NodeType = IElement | IElementRef | INodeRef | ITemplateRef | IComponentRef;


export class NodeRef<T = NodeType, TCtx extends AnnoationContext = AnnoationContext>
    extends ContextNode<TCtx> implements INodeRef<T, TCtx> {

    private _rootNodes: T[]
    get rootNodes(): T[] {
        return this._rootNodes;
    }

    constructor(context: TCtx, nodes: T[]) {
        super(context);
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
        super.destroy();
    }
}

export class ElementRef<T = any, TCtx extends AnnoationContext = AnnoationContext>
    extends ContextNode<TCtx> implements IElementRef<T, TCtx> {

    constructor(context: TCtx, public readonly nativeElement: T) {
        super(context);
        let injector = context.injector;
        if (!injector.has(ELEMENT_REFS)) {
            injector.registerValue(ELEMENT_REFS, new WeakMap());
        }
        injector.get(ELEMENT_REFS).set(nativeElement, this);
        this.onDestroy(() => injector.get(ELEMENT_REFS)?.delete(nativeElement));
    }

    protected destroying(): void {
        let element = this.nativeElement as T & IDestoryable;
        if (element && isFunction(element.destroy)) {
            element.destroy();
        }
        super.destroy();
    }
}

export class TemplateRef<T = NodeType, TCtx extends AnnoationContext = AnnoationContext>
    extends NodeRef<T, TCtx> implements ITemplateRef<T, TCtx> {
    get template() {
        return this.context.get(CTX_TEMPLATE);
    }
}

export class ComponentRef<T = any, TN = NodeType, TCtx extends AnnoationContext = AnnoationContext>
    extends ContextNode<TCtx> implements IComponentRef<T, TN, TCtx> {

    constructor(
        public readonly componentType: Type<T>,
        public readonly instance: T,
        context: TCtx,
        public readonly nodeRef: ITemplateRef<TN>
    ) {
        super(context);
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
        super.destroying();
    }
}

