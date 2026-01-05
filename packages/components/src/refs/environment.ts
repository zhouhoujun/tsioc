import { DefaultInvocationContext, Type } from '@tsdi/ioc';
import { ElementRef } from './element';
import { TemplateRef } from './template';
import { RNode } from '../renderer/Node';
import { DirectiveRef } from './directive';
import { ComponentRef } from './component';
import { ViewContainerRef } from './container';
import { createViewContainerRef } from '../impl/container';


export class EnvironmentState {

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

/**
 * Environment context
 */

export class EnvironmentContext extends DefaultInvocationContext {

    // 私有属性用于存储引用映射
    private state = new EnvironmentState();


    protected override afterInit(): void {
        this.setValue(EnvironmentState, this.state);
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


    /**
     * get component ref.
     * @param componentType component type.
     */
    getComponentRef<T>(componentType: Type<T>): ComponentRef<T>[] {
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
    getComponentRefByNode(node: RNode): ComponentRef<any> | null {
        return this.state.componentRefs.get(node) ?? this.getParentEnviroment()?.getComponentRefByNode(node) ?? null;
    }

    /**
     * get directive ref.
     * @param componentType directive type.
     */
    getDirectiveRef<T>(componentType: Type<T>): DirectiveRef<T>[] {
        const results: DirectiveRef<T>[] = this.getParentEnviroment()?.getDirectiveRef(componentType) ?? [];
        this.state.directiveRefs.forEach(refs => {
            refs.forEach(ref => {
                if (ref.instance instanceof componentType) {
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
    getDirectiveRefByNode(node: RNode): DirectiveRef<any> | null {
        const refs = this.state.directiveRefs.get(node);
        return refs && refs.length > 0 ? refs[0] : this.getParentEnviroment()?.getDirectiveRefByNode(node) ?? null;
    }

    /**
     * get template ref.
     * @param node template element.
     */
    getTemplateRef<T>(node: RNode): TemplateRef<T> | null {
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
    getElementRef<T extends RNode>(node: T): ElementRef<T> {
        if (!this.state.elementRefs.has(node)) {
            this.state.elementRefs.set(node, new ElementRef(node));
        }
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
    getViewContainerRef<T extends RNode>(nodeOrRef: T | ElementRef<T>): ViewContainerRef<T> {
        const node = nodeOrRef instanceof ElementRef ? nodeOrRef.nativeElement : nodeOrRef;
        return this.state.viewContainerRefs.get(node) ?? this.getParentEnviroment()?.getViewContainerRef(node) ?? this.createViewContainerRef(node);
    }

    createElementRef<T extends RNode>(node: T): ElementRef<T> {
        const eRef = new ElementRef(node);
        this.state.elementRefs.set(node, eRef);
        return eRef;
    }

    createViewContainerRef<T extends RNode>(node: T): ViewContainerRef<T> {
        const containerRef = createViewContainerRef(this.getElementRef(node), this);
        this.state.viewContainerRefs.set(node, containerRef);
        return containerRef;

    }

}
