import { Type, isFunction, Destoryable, IDestoryable, tokenId, Injectable, Inject } from '@tsdi/ioc';
import { IAnnoationContext, CTX_TEMPLATE,  } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';

export const CTX_COMPONENT_DECTOR = tokenId<string>('CTX_COMPONENT_DECTOR');
export const CTX_COMPONENT = tokenId<any>('CTX_COMPONENT');
export const CTX_ELEMENT_REF = tokenId<any | any[]>('CTX_ELEMENT_REF');
export const CTX_TEMPLATE_REF = tokenId<any | any[]>('CTX_TEMPLATE_REF');
export const CTX_TEMPLATE_SCOPE = tokenId<any>('CTX_TEMPLATE_SCOPE');
export const CTX_COMPONENT_REF = tokenId<ComponentRef>('CTX_COMPONENT_REF');

export const COMPONENT_REFS = tokenId<WeakMap<any, IComponentRef<any, any>>>('COMPONENT_REFS');
export const ELEMENT_REFS = tokenId<WeakMap<any, IElementRef<any>>>('ELEMENT_REFS');


export interface IContextNode<TCtx extends IAnnoationContext = IAnnoationContext> extends IDestoryable {
    readonly context: TCtx;
}


export class ContextNode<TCtx extends IAnnoationContext = IAnnoationContext> extends Destoryable {
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
        delete this._context;
    }
}

/**
 *  element type.
 */
export interface IElement {
    destroy?();
}

export const CONTEXT_REF = tokenId<IAnnoationContext>('CONTEXT_REF');

export const ELEMENT_REF = tokenId<IElementRef>('ELEMENT_REF');

export const NATIVE_ELEMENT = tokenId<IElement>('NATIVE_ELEMENT');

export interface IElementRef<T = any, TCtx extends IAnnoationContext = IAnnoationContext> extends IContextNode<TCtx> {
    readonly nativeElement: T;
}

export interface INodeRef<T = any, TCtx extends IAnnoationContext = IAnnoationContext> extends IContextNode<TCtx> {
    readonly rootNodes: T[];
}

export const TEMPLATE_REF = tokenId<ITemplateRef>('TEMPLATE_REF');
export const ROOT_NODES = tokenId<any[]>('ROOT_NODES');

export interface ITemplateRef<T = any, TCtx extends IAnnoationContext = IAnnoationContext> extends INodeRef<T, TCtx> {
    readonly template: any;
}

export const REFCHILD_SELECTOR = tokenId<string>('REFCHILD_SELECTOR');
export const COMPONENT_REF = tokenId<IComponentRef>('COMPONENT_REF');
export const COMPONENT_TYPE = tokenId<Type>('COMPONENT_TYPE');
export const COMPONENT_INST = tokenId<object>('COMPONENT_INST');

export interface IComponentRef<T = any, TN = NodeType, TCtx extends IAnnoationContext = IAnnoationContext> extends IContextNode<TCtx> {
    readonly componentType: Type<T>;
    readonly instance: T;
    readonly selector: string;
    readonly nodeRef: ITemplateRef<TN>;
    getNodeSelector(): NodeSelector;
}

export type NodeType = IElement | IElementRef | INodeRef | ITemplateRef | IComponentRef;


export class NodeRef<T = NodeType, TCtx extends IAnnoationContext = IAnnoationContext>
    extends ContextNode<TCtx> implements INodeRef<T, TCtx> {

    private _rootNodes: T[]
    get rootNodes(): T[] {
        return this._rootNodes;
    }

    constructor(
        @Inject(CONTEXT_REF) context: TCtx,
        @Inject(ROOT_NODES) nodes: T[]) {
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
        this._rootNodes.length = 0;
        delete this._rootNodes;
        super.destroying();
    }
}



@Injectable
export class ElementRef<T = any, TCtx extends IAnnoationContext = IAnnoationContext>
    extends ContextNode<TCtx> implements IElementRef<T, TCtx> {

    constructor(
        @Inject(CONTEXT_REF) context: TCtx,
        @Inject(NATIVE_ELEMENT) public readonly nativeElement: T) {
        super(context);

        let injector = context.injector;
        if (!injector.has(ELEMENT_REFS)) {
            injector.setValue(ELEMENT_REFS, new WeakMap());
        }
        injector.getSingleton(ELEMENT_REFS).set(nativeElement, this);
        this.onDestroy(() => injector.getSingleton(ELEMENT_REFS)?.delete(nativeElement));
    }

    protected destroying(): void {
        let element = this.nativeElement as T & IDestoryable;
        if (element && isFunction(element.destroy)) {
            element.destroy();
        }
        super.destroying();
    }
}

@Injectable
export class TemplateRef<T = NodeType, TCtx extends IAnnoationContext = IAnnoationContext>
    extends NodeRef<T, TCtx> implements ITemplateRef<T, TCtx> {
    get template() {
        return this.context.getValue(CTX_TEMPLATE);
    }
}


@Injectable
export class ComponentRef<T = any, TN = NodeType, TCtx extends IAnnoationContext = IAnnoationContext>
    extends ContextNode<TCtx> implements IComponentRef<T, TN, TCtx> {

    get selector() {
        return this.context.getValue(REFCHILD_SELECTOR);
    }
    constructor(
        @Inject(COMPONENT_TYPE) public readonly componentType: Type<T>,
        @Inject(COMPONENT_INST) public readonly instance: T,
        @Inject(CONTEXT_REF) context: TCtx,
        @Inject(TEMPLATE_REF) public readonly nodeRef: ITemplateRef<TN>
    ) {
        super(context);
        if (!context.injector.has(COMPONENT_REFS)) {
            context.injector.setValue(COMPONENT_REFS, new WeakMap());
        }
        let injector = context.injector;
        injector.getSingleton(COMPONENT_REFS).set(instance, this);
        this.onDestroy(() => injector.getSingleton(COMPONENT_REFS)?.delete(this.instance));
    }

    getNodeSelector(): NodeSelector {
        return new NodeSelector(this.nodeRef);
    }

    protected destroying(): void {
        this.nodeRef.destroy();
        super.destroying();
    }
}

