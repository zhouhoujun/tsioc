import { Type, isFunction, Destoryable, IDestoryable, tokenId, Injectable, Inject, Express, isBoolean } from '@tsdi/ioc';
import { IAnnoationContext, CTX_TEMPLATE,  } from '@tsdi/boot';

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

export type NodeType = IElement | IElementRef | INodeRef | ITemplateRef; // | IComponentRef;


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
        injector.getValue(ELEMENT_REFS).set(nativeElement, this);
        this.onDestroy(() => injector.getValue(ELEMENT_REFS)?.delete(nativeElement));
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
        injector.getValue(COMPONENT_REFS).set(instance, this);
        this.onDestroy(() => injector.getValue(COMPONENT_REFS)?.delete(this.instance));
    }

    getNodeSelector(): NodeSelector {
        return new NodeSelector(this.nodeRef);
    }

    protected destroying(): void {
        this.nodeRef.destroy();
        super.destroying();
    }
}

/**
 * route： route up. iterate in parents.
 * children： iterate in children.
 * traverse: iterate as tree map. node first.
 * traverseLast: iterate as tree map. node last.
 */
export type Mode = 'route' | 'children' | 'traverse' | 'traverseLast';


/**
 * node selector.
 *
 * @export
 * @abstract
 * @class NodeSelector
 * @template T
 */
export class NodeSelector<T = any> {

    constructor(protected node: INodeRef<T>) {

    }

    find<Tc extends T>(express: Tc | Express<Tc, boolean>, mode?: Mode): Tc {
        let component: Tc;
        this.each<Tc>(item => {
            if (component) {
                return false;
            }
            let isFinded = isFunction(express) ? express(item) : item === express;
            if (isFinded) {
                component = item;
                return false;
            }
            return true;
        }, mode);
        return component as Tc;
    }

    filter<Tc extends T>(express: Express<Tc, boolean | void>, mode?: Mode): Tc[] {
        let nodes: T[] = [];
        this.each<Tc>(item => {
            if (express(item)) {
                nodes.push(item);
            }
        }, mode);
        return nodes as Tc[];
    }

    map<Tc extends T, TR>(express: Express<Tc, TR | boolean>, mode?: Mode): TR[] {
        let nodes: TR[] = [];
        this.each<Tc>(item => {
            let r = express(item)
            if (isBoolean(r)) {
                return r;
            } else if (r) {
                nodes.push(r);
            }
        }, mode);
        return nodes;
    }

    each<Tc extends T>(express: Express<Tc, boolean | void>, mode?: Mode) {
        // mode = mode || 'traverse';
        let r;
        switch (mode) {
            case 'route':
                r = this.routeUp(this.node, express);
                break;
            case 'children':
                r = this.eachChildren(this.node, express);
                break;
            case 'traverseLast':
                r = this.transAfter(this.node, express);
                break;

            case 'traverse':
            default:
                r = this.trans(this.node, express);
                break;
        }
        return r;
    }


    protected eachChildren<Tc extends T>(node: INodeRef<T>, express: Express<Tc, void | boolean>) {
        this.getChildren(node).some(item => this.currNode(item, express) === false);
    }

    /**
     *do express work in routing.
     *
     *@param {Express<T, void | boolean>} express
     *
     *@memberOf IComponent
     */
    routeUp(node: INodeRef<T>, express: Express<T, void | boolean>) {
        if (!node) {
            return true;
        }
        if (this.currNode(node, express) === false) {
            return false;
        }
        let parentNode = this.getParent(node);
        if (parentNode) {
            return this.routeUp(parentNode, express);
        }
    }

    /**
     *translate all sub context to do express work.
     *
     *@param {Express<IComponent, void | boolean>} express
     *
     *@memberOf IComponent
     */
    trans(node: INodeRef<T>, express: Express<T, void | boolean>) {
        if (!node) {
            return true;
        }
        if (this.currNode(node, express) === false) {
            return false;
        }
        let children = this.getChildren(node);

        if (children.some(r => this.trans(r, express) === false)) {
            return false;
        }

        return true;
    }

    transAfter(node: INodeRef<T>, express: Express<T, void | boolean>) {
        if (!node) {
            return true;
        }
        let children = this.getChildren(node);
        if (children.some(r => this.transAfter(r, express) === false)) {
            return false;
        }

        if (this.currNode(node, express) === false) {
            return false;
        }
        return true;
    }

    protected currNode(node: INodeRef<T>, express: Express<T, void | boolean>): boolean {
        let roots = node.rootNodes;
        if (roots.some(n => {
            if (n instanceof NodeRef) {
                return this.currNode(n, express);
            } else if (n instanceof ComponentRef) {
                if (express(n) === false) {
                    return true;
                }
                return this.currNode(n.nodeRef, express);
            } else if (n instanceof ElementRef) {
                return express(n.nativeElement) === false;
            }
            return express(n) === false
        })) {
            return false;
        }
    }

    protected getParent(node: INodeRef<T>): NodeRef<T> {

        let parent = node.context.getParent();
        if (parent && parent.hasValue(NodeRef)) {
            return parent.getValue(NodeRef) as NodeRef<T>;
        }

        return null;
    }

    protected getChildren(node: INodeRef<T>): NodeRef<T>[] {
        let ctx = node.context
        if (ctx.hasChildren()) {
            return ctx.getChildren().map(c => c.getValue(NodeRef) as NodeRef<T>);
        }

        return [];
    }
}


export class NullSelector<T = any> extends NodeSelector<T> {
    protected getParent(node: NodeRef<T>): NodeRef<T> {
        return null
    }

    protected getChildren(node: NodeRef<T>): NodeRef<T>[] {
        return [];
    }
}

