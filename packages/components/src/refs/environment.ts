import { createResolveHandler, DefaultInvocationContext, getDef, InjectFlags, invokeTail, isFunction, isResolved, isString, isType, ResolveHandler, ResolveInterceptorFn, ResolveInterceptorLike, TargetInvokeArguments, token, Type } from '@tsdi/ioc';
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


export class EnvironmentState {

    [noReact] = true;


    // 私有属性用于存储引用映射
    readonly componentRefs: Map<RNode, ComponentRef<any>> = new Map();
    readonly directiveRefs: Map<RNode, DirectiveRef<any>[]> = new Map();
    readonly templateRefs: Map<RNode, TemplateRef<any>> = new Map();
    readonly elementRefs: Map<RNode, ElementRef<any>> = new Map();
    readonly viewContainerRefs: Map<RNode, ViewContainerRef> = new Map();
    /** computed cache. */
    readonly computedCache: Map<string, { value: any, deps: Set<any> }> = new Map();

    clear() {
        this.componentRefs.clear();
        this.directiveRefs.clear();
        this.templateRefs.clear();
        this.computedCache.clear();
        this.viewContainerRefs.clear();
    }

}

export const NODES_RESOLVERS = token<ResolveInterceptorLike[]>('NODES_RESOLVERS');


export const nodeResolveInterceptorFactory: () => ResolveInterceptorFn = () => {
    let hanlder: ResolveHandler;
    return (input, next, context) => {
        const environment = context.getInjector() as EnvironmentContext;
        const paramType = input.provider ?? input.type;
        if (context.getPayload() instanceof ElementRef && environment instanceof EnvironmentContext && isFunction(paramType)) {
            if (!hanlder) {
                hanlder = createResolveHandler(environment.get(NODES_RESOLVERS) ?? []);
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
 * Environment context
 */

export class EnvironmentContext extends DefaultInvocationContext {
    [noReact] = true;

    protected override initOptions(options: TargetInvokeArguments): void {
        if (!options.resolvers) options.resolvers = [];
        options.resolvers.push(nodeResolveInterceptorFactory())
    }

    // 私有属性用于存储引用映射
    private state = new EnvironmentState();


    protected override afterInit(): void {
        this.setValue(EnvironmentState, this.state);
        this.onDestroy(()=> this.state.clear());
    }

    getParentEnviroment(): EnvironmentContext | null {
        return this._parent instanceof EnvironmentContext ? this._parent : null;
    }

    /**
     * attach component ref to element.
     * @param compRef view ref.
     */
    attachComponent<C>(compRef: ComponentRef<C>): void {
        if (compRef && compRef.elementRef && compRef.elementRef.nativeElement) {
            const el = compRef.elementRef.nativeElement;
            if (!this.state.elementRefs.has(el)) {
                this.state.elementRefs.set(el, compRef.elementRef);
            }
            this.state.componentRefs.set(compRef.elementRef.nativeElement, compRef);
        }
    }

    /**
     * attach directive ref to element.
     * @param dirRef view ref.
     */
    attachDirective<C>(dirRef: DirectiveRef<C>): void {
        if (dirRef && dirRef.elementRef && dirRef.elementRef.nativeElement) {
            const element = dirRef.elementRef.nativeElement;
            if (!this.state.elementRefs.has(element)) {
                this.state.elementRefs.set(element, dirRef.elementRef);
            }
            if (!this.state.directiveRefs.has(element)) {
                this.state.directiveRefs.set(element, []);
            }
            this.state.directiveRefs.get(element)!.push(dirRef);
        }
    }

    /**
     * attach template ref to element.
     * @param tempRef view ref.
     * @param element element.
     */
    attachTemplate<C>(tempRef: TemplateRef<C>): void {
        if (tempRef && tempRef.elementRef && tempRef.elementRef.nativeElement) {
            const el = tempRef.elementRef.nativeElement;
            if (!this.state.elementRefs.has(el)) {
                this.state.elementRefs.set(el, tempRef.elementRef);
            }
            this.state.templateRefs.set(el, tempRef);
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

            return this.getTemplateRef(node) ?? this.getElementRef(node);
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

            return this.getTemplateRef(node) ?? this.getElementRef(node);
        });
    }


    /**
     * get component ref.
     * @param componentType component type.
     */
    getComponentRef<T>(componentType: Type<T>, flags = InjectFlags.Default): ComponentRef<T>[] {
        const results: ComponentRef<T>[] = this.getParentEnviroment()?.getComponentRef(componentType) ?? [];
        this.state.componentRefs.forEach(ref => {
            if (ref.instance instanceof componentType) {
                results.push(ref as ComponentRef<T>);
            }
        });
        return results;
    }

    /**
     * get component ref.
     * @param node element.
     */
    getComponentRefByNode(node: RNode, flags = InjectFlags.Default): ComponentRef<any> | null {
        return this.state.componentRefs.get(node) ?? this.getParentEnviroment()?.getComponentRefByNode(node) ?? null;
    }

    /**
     * get directive ref.
     * @param directorType directive type.
     */
    getDirectiveRef<T>(directorType: Type<T>, flags = InjectFlags.Default): DirectiveRef<T>[] {
        const results: DirectiveRef<T>[] = this.getParentEnviroment()?.getDirectiveRef(directorType) ?? [];
        this.state.directiveRefs.forEach(refs => {
            refs.forEach(ref => {
                if (ref.instance instanceof directorType) {
                    results.push(ref as DirectiveRef<T>);
                }
            });
        });
        return results;
    }

    /**
     * get directive ref.
     * @param node element.
     */
    getDirectiveRefByNode(node: RNode, flags = InjectFlags.Default): DirectiveRef<any> | null {
        const refs = this.state.directiveRefs.get(node);
        return refs && refs.length > 0 ? refs[0] : this.getParentEnviroment()?.getDirectiveRefByNode(node) ?? null;
    }

    /**
     * get template ref.
     * @param node template element.
     */
    getTemplateRef<T>(node: RNode, flags = InjectFlags.Default): TemplateRef<T> | null {
        return this.state.templateRefs.get(node) ?? this.getParentEnviroment()?.getTemplateRef(node) ?? null;
    }

    /**
     * get element ref.
     *
     * @template T
     * @param {T} node
     * @return {*}  {ElementRef<T>}
     * @memberof EnvironmentContext
     */
    getElementRef<T extends RNode>(node: T, flags = InjectFlags.Default): ElementRef<T> {
        return this.state.elementRefs.get(node) ?? this.getParentEnviroment()?.getElementRef(node) ?? this.createElementRef(node);
    }

    /**
     * get container ref.
     *
     * @template T
     * @param {T} node
     * @return {*}  {ElementRef<T>}
     * @memberof EnvironmentContext
     */
    getViewContainerRef<T extends RNode>(nodeOrRef: T | ElementRef<T>, flags = InjectFlags.Default): ViewContainerRef<T> {
        const node = nodeOrRef instanceof ElementRef ? nodeOrRef.nativeElement : nodeOrRef;
        return this.state.viewContainerRefs.get(node) ?? this.getParentEnviroment()?.getViewContainerRef(node) ?? this.createViewContainerRef(node);
    }

    protected createElementRef<T extends RNode>(node: T): ElementRef<T> {
        const eRef = new ElementRef(node);
        this.state.elementRefs.set(node, eRef);
        return eRef;
    }

    protected createViewContainerRef<T extends RNode>(node: T): ViewContainerRef<T> {
        const containerRef = createViewContainerRef(this.getElementRef(node), this);
        this.state.viewContainerRefs.set(node, containerRef);
        return containerRef;
    }

}
