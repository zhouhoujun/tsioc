import { createResolveHandler, ContextInjector, getDef, InjectFlags, invokeTail, isFunction, isResolved, isString, isType, ResolveHandler, ResolveInterceptorFn, ResolveInterceptorLike, TargetInvokeArguments, token, Type } from '@tsdi/ioc';
import { ElementRef } from './element';
import { TemplateRef } from './template';
import { RNode } from '../renderer/Node';
import { DirectiveDef, DirectiveRef, DirectiveType } from './directive';
import { ComponentDef, ComponentRef } from './component';
import { ViewContainerRef } from './container';
import { createViewContainerRef } from '../impl/container';
import { noReact } from '../effect';
import { ViewRef } from './view';
import { Renderer } from '../renderer/Renderer';


export const NODES_RESOLVERS = token<ResolveInterceptorLike[]>('NODES_RESOLVERS');


export const nodeResolveInterceptorFactory: () => ResolveInterceptorFn = () => {
    let hanlder: ResolveHandler;
    return (input, next, context) => {
        const nodeInjector = context.getInjector() as NodeInjector;
        const paramType = input.provider ?? input.type;
        const payload = nodeInjector.getPayload();
        if (payload instanceof ElementRef && nodeInjector instanceof NodeInjector && isFunction(paramType)) {
            if (!hanlder) {
                hanlder = createResolveHandler(nodeInjector.get(NODES_RESOLVERS) ?? []);
            }

            return invokeTail(() => hanlder.handle(input, context), (res) => {
                if (isResolved(res)) return res;

                return next(input, context)
            })
        }
        return next(input, context);
    }
}


/**
 * Node Injector - Context injector for template nodes
 */

export class NodeInjector extends ContextInjector {
    [noReact] = true;

    private _payload: any;

    static readonly allDirectiveRefs: Map<RNode, DirectiveRef<any>[]> = new Map();

    readonly componentRefs: Map<RNode, ComponentRef<any>> = new Map();
    readonly directiveRefs: Map<RNode, DirectiveRef<any>[]> = new Map();
    readonly templateRefs: Map<RNode, TemplateRef<any>> = new Map();
    readonly elementRefs: Map<RNode, ElementRef<any>> = new Map();
    readonly viewContainerRefs: Map<RNode, ViewContainerRef> = new Map();
    readonly computedCache: Map<string, { value: any, deps: Set<any> }> = new Map();
    readonly parentNodes: Map<RNode, RNode> = new Map();

    protected override initOptions(options: TargetInvokeArguments): void {
        if (!options.resolvers) options.resolvers = [];
        options.resolvers.push(nodeResolveInterceptorFactory())
        if (options.payload) {
            this._payload = options.payload;
        }
    }

    setPayload(payload: any): this {
        this._payload = payload;
        return this;
    }

    getPayload<T = any>(): T {
        return this._payload;
    }

    clear(): void {
        this.componentRefs.clear();
        this.directiveRefs.clear();
        this.templateRefs.clear();
        this.computedCache.clear();
        this.viewContainerRefs.clear();
        this.parentNodes.clear();
    }

    getParentInjector(): NodeInjector | null {
        return this._parent instanceof NodeInjector ? this._parent : null;
    }

    attachComponent<C>(compRef: ComponentRef<C>): void {
        if (compRef && compRef.elementRef && compRef.elementRef.nativeElement) {
            const el = compRef.elementRef.nativeElement;
            if (!this.elementRefs.has(el)) {
                this.elementRefs.set(el, compRef.elementRef);
            }
            this.componentRefs.set(compRef.elementRef.nativeElement, compRef);
        }
    }

    attachDirective<C>(dirRef: DirectiveRef<C>): void {
        if (dirRef && dirRef.elementRef && dirRef.elementRef.nativeElement) {
            const element = dirRef.elementRef.nativeElement;
            // console.log('[attachDirective] Attaching directive to node:', (element as any)?.tagName, 'directive:', dirRef.instance?.constructor?.name);
            if (!this.elementRefs.has(element)) {
                this.elementRefs.set(element, dirRef.elementRef);
            }
            if (!this.directiveRefs.has(element)) {
                this.directiveRefs.set(element, []);
            }
            this.directiveRefs.get(element)!.push(dirRef);
            if (!NodeInjector.allDirectiveRefs.has(element)) {
                NodeInjector.allDirectiveRefs.set(element, []);
            }
            NodeInjector.allDirectiveRefs.get(element)!.push(dirRef);
            // console.log('[attachDirective] Directives on node:', Array.from(this.directiveRefs.entries()).map(([k, v]) => ((k as any)?.tagName || 'unknown') + ':' + v.map(d => d.instance?.constructor?.name).join(',')));
        }
    }

    attachTemplate<C>(tempRef: TemplateRef<C>): void {
        if (tempRef && tempRef.elementRef && tempRef.elementRef.nativeElement) {
            const el = tempRef.elementRef.nativeElement;
            if (!this.elementRefs.has(el)) {
                this.elementRefs.set(el, tempRef.elementRef);
            }
            this.templateRefs.set(el, tempRef);
        }
    }


    query<T>(selector: Type<T>, el: RNode | RNode[], options?: {  }): ComponentRef<T> | DirectiveRef<T> | null;
    query<C>(selector: string, el: RNode | RNode[]): ElementRef<C> | ViewRef<C> | TemplateRef<C> | null;
    query(selector: string | Type, el: RNode | RNode[]): any {
        let sel: string;
        let def: ComponentDef | DirectiveDef | undefined;
        if (isString(selector)) {
            sel = selector
        } else {
            def = getDef(selector) as ComponentDef | DirectiveDef;
            sel = def.selector;
        }
        if (!sel) {
            return null;
        }

        const node = this.get(Renderer).querySelector(el, sel);
        if (node) {
            if (def && def.dirType) {
                if (def.dirType === DirectiveType.Component) {
                    return this.getComponentRefByNode(node) ?? null
                }
                return this.getDirectiveRefByNode(node) ?? null;
            }

            // For CSS string selectors, prefer ElementRef over TemplateRef
            // This matches expected behavior for element queries like '.switch-content'
            return this.getElementRef(node) ?? this.getTemplateRef(node);
        }

        return null;
    }


    queryAll<T>(selector: Type<T>, el: RNode | RNode[]): Array<ComponentRef<T> | DirectiveRef<T>>;
    queryAll<C>(selector: string, el: RNode | RNode[]): Array<ElementRef<C> | ViewRef<C> | TemplateRef<C>>;
    queryAll(selector: string | Type, el: RNode | RNode[]): Array<any> {
        let sel: string;
        let def: ComponentDef | DirectiveDef | undefined;
        if (isString(selector)) {
            sel = selector
        } else {
            def = getDef(selector) as ComponentDef | DirectiveDef;
            sel = def.selector;
        }
        if (!sel) {
            return [];
        }
        const nodes = this.get(Renderer).querySelectorAll(el, sel);
        if (!nodes) {
            return [];
        }

        return nodes.map(node => {
            if (def && def.dirType) {
                if (def.dirType === DirectiveType.Component) {
                    return this.getComponentRefByNode(node) ?? null
                }
                return this.getDirectiveRefByNode(node) ?? null;
            }

            // For CSS string selectors, prefer ElementRef over TemplateRef
            return this.getElementRef(node) ?? this.getTemplateRef(node);
        });
    }


    getComponentRef<T>(componentType: Type<T>, flags = InjectFlags.Default): ComponentRef<T>[] {
        const results: ComponentRef<T>[] = this.getParentInjector()?.getComponentRef(componentType) ?? [];
        this.componentRefs.forEach(ref => {
            if (ref.instance instanceof componentType) {
                results.push(ref as ComponentRef<T>);
            }
        });
        return results;
    }

    getComponentRefByNode(node: RNode, flags = InjectFlags.Default): ComponentRef<any> | null {
        return this.componentRefs.get(node) ?? this.getParentInjector()?.getComponentRefByNode(node) ?? null;
    }

    getDirectiveRef<T>(directorType: Type<T>, flags = InjectFlags.Default): DirectiveRef<T>[] {
        const results: DirectiveRef<T>[] = this.getParentInjector()?.getDirectiveRef(directorType) ?? [];
        this.directiveRefs.forEach(refs => {
            refs.forEach(ref => {
                try {
                    if (ref.instance && ref.instance instanceof directorType) {
                        results.push(ref as DirectiveRef<T>);
                    }
                } catch (e) {
                    // Directive instantiation failed, skip it
                }
            });
        });
        return results;
    }

    getDirectiveRefByNode(node: RNode, flags = InjectFlags.Default): DirectiveRef<any> | null {
        const refs = this.directiveRefs.get(node);
        if (refs && refs.length > 0) return refs[0];
        const staticRefs = NodeInjector.allDirectiveRefs.get(node);
        if (staticRefs && staticRefs.length > 0) return staticRefs[0];
        return this.getParentInjector()?.getDirectiveRefByNode(node) ?? null;
    }

    getDirectiveRefsByNode(node: RNode): DirectiveRef<any>[] | null {
        const refs = this.directiveRefs.get(node);
        if (refs && refs.length > 0) return refs;
        const staticRefs = NodeInjector.allDirectiveRefs.get(node);
        if (staticRefs && staticRefs.length > 0) return staticRefs;
        return this.getParentInjector()?.getDirectiveRefsByNode(node) ?? null;
    }

    getTemplateRef<T>(node: RNode, flags = InjectFlags.Default): TemplateRef<T> | null {
        return this.templateRefs.get(node) ?? this.getParentInjector()?.getTemplateRef(node) ?? null;
    }

    getElementRef<T extends RNode>(node: T, flags = InjectFlags.Default): ElementRef<T> {
        return this.elementRefs.get(node) ?? this.getParentInjector()?.getElementRef(node) ?? this.createElementRef(node);
    }

    getViewContainerRef<T extends RNode>(nodeOrRef: T | ElementRef<T>, flags = InjectFlags.Default): ViewContainerRef<T> {
        const node = nodeOrRef instanceof ElementRef ? nodeOrRef.nativeElement : nodeOrRef;
        return this.viewContainerRefs.get(node) ?? this.getParentInjector()?.getViewContainerRef(node) ?? this.createViewContainerRef(node);
    }

    protected createElementRef<T extends RNode>(node: T): ElementRef<T> {
        const eRef = new ElementRef(node);
        this.elementRefs.set(node, eRef);
        return eRef;
    }

    createViewContainerRef<T extends RNode>(node: T): ViewContainerRef<T> {
        const containerRef = createViewContainerRef(this.getElementRef(node), this);
        this.viewContainerRefs.set(node, containerRef);
        return containerRef;
    }

    setParentNode(node: RNode, parent: RNode): void {
        this.parentNodes.set(node, parent);
    }

    getParentNode(node: RNode): RNode | null {
        return this.parentNodes.get(node) ?? this.getParentInjector()?.getParentNode(node) ?? null;
    }

}

export { NodeInjector as EnvironmentContext };
