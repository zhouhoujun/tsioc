import { DefaultInvocationContext, Type } from '@tsdi/ioc';
import { ElementRef } from './element';
import { TemplateRef } from './template';
import { RNode } from '../renderer/Node';
import { DirectiveRef } from './directive';
import { ComponentRef } from './component';


export class EnvironmentState {

    // 私有属性用于存储引用映射
    readonly componentRefs: Map<RNode, ComponentRef<any>> = new Map();
    readonly directiveRefs: Map<RNode, DirectiveRef<any>[]> = new Map();
    readonly templateRefs: Map<RNode, TemplateRef<any>> = new Map();
    readonly elementRefs: Map<RNode, ElementRef<any>> = new Map();
    /** computed cache. */
    readonly computedCache: Map<string, { value: any, deps: Set<any> }> = new Map();

    clear() {
        this.componentRefs.clear();        
        this.directiveRefs.clear();
        this.templateRefs.clear();
        this.computedCache.clear();
    }

}

/**
 * Environment context
 */

export class EnvironmentContext extends DefaultInvocationContext {

    // 私有属性用于存储引用映射
    private state = new EnvironmentState();


    protected override afterInit(): void {
        this.injector.setValue(EnvironmentState, this.state);
    }

    // /**
    //  * get computed cache.
    //  */
    // getComputed(key: string): Map<string, { value: any, deps: Set<any> }> {
       
    // }



    /**
     * attach component ref to element.
     * @param compRef view ref.
     */
    attachComponent<C>(compRef: ComponentRef<C>): void {
        if (compRef && compRef.elementRef && compRef.elementRef.nativeElement) {
            const el = compRef.elementRef.nativeElement;
            if (!this._elementRefs.has(el)) {
                this._elementRefs.set(el, compRef.elementRef);
            }
            this._componentRefs.set(compRef.elementRef.nativeElement, compRef);
        }
    }

    /**
     * attach directive ref to element.
     * @param dirRef view ref.
     */
    attachDirective<C>(dirRef: DirectiveRef<C>): void {
        if (dirRef && dirRef.elementRef && dirRef.elementRef.nativeElement) {
            const element = dirRef.elementRef.nativeElement;
            if (!this._elementRefs.has(element)) {
                this._elementRefs.set(element, dirRef.elementRef);
            }
            if (!this._directiveRefs.has(element)) {
                this._directiveRefs.set(element, []);
            }
            this._directiveRefs.get(element)!.push(dirRef);
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
            if (!this._elementRefs.has(el)) {
                this._elementRefs.set(el, tempRef.elementRef);
            }
            this._templateRefs.set(el, tempRef);
        }
    }


    /**
     * get component ref.
     * @param componentType component type.
     */
    getComponentRef<T>(componentType: Type<T>): ComponentRef<T>[] {
        const results: ComponentRef<T>[] = [];
        this._componentRefs.forEach(ref => {
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
        return this._componentRefs.get(node) || null;
    }

    /**
     * get directive ref.
     * @param componentType directive type.
     */
    getDirectiveRef<T>(componentType: Type<T>): DirectiveRef<T>[] {
        const results: DirectiveRef<T>[] = [];
        this._directiveRefs.forEach(refs => {
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
        const refs = this._directiveRefs.get(node);
        return refs && refs.length > 0 ? refs[0] : null;
    }

    /**
     * get template ref.
     * @param node template element.
     */
    getTemplateRef<T>(node: RNode): TemplateRef<T> | null {
        return this._templateRefs.get(node) ?? null;
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
        if (!this._elementRefs.has(node)) {
            this._elementRefs.set(node, new ElementRef(node));
        }
        return this._elementRefs.get(node) as ElementRef<T>;
    }
}
