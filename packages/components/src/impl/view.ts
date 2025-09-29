import { getDef, isString, Type } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentDef, ComponentRef } from '../refs/component';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { NodeType, RNode } from '../renderer/Node';
import { DirectiveDef, DirectiveRef } from '../refs/directive';
import { createElementRef, ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';

/**
 * Embedded view ref implement.
 *
 * @export
 * @class EmbeddedViewRefImpl
 * @extends {ViewRefImpl}
 * @implements {EmbeddedViewRef<C>}
 * @template C
 */
export class EmbeddedViewRefImpl<C> implements EmbeddedViewRef<C> {
    private _isDestroyed = false;
    private _destroyCallbacks: (() => void)[] = [];

    protected elementRefMap = new Map<RNode, ElementRef<any>>();
    protected directiveRefMap = new Map<RNode, DirectiveRef<any>>();
    protected componentRefMap = new Map<RNode, ComponentRef<any>>();
    protected templateRefMap = new Map<RNode, TemplateRef<any>>();



    // 添加计算属性缓存
    readonly computedCache = new Map<string, { value: any, deps: Set<any> }>();

    /**
     * Creates an instance of EmbeddedViewRefImpl.
     * @param {RNode[]} rootNodes
     * @param {C} context
     * @param {ReactiveEffect} effect
     * @memberof EmbeddedViewRefImpl
     */
    constructor(
        public rootNodes: RNode[],
        public context: C,
        private effect: ReactiveEffect
    ) { }


    bindComponentRef<T>(el: RNode, componentRef: ComponentRef<T>): void {
        componentRef.elementRef && this.elementRefMap.set(el, componentRef.elementRef);
        this.componentRefMap.set(el, componentRef);
    }
    bindDirectiveRef<T>(el: RNode, directiveRef: DirectiveRef<T>): void {
        this.elementRefMap.set(el, directiveRef.elementRef);
        this.directiveRefMap.set(el, directiveRef);
    }
    bindTemplateRef<T>(el: RNode, templateRef: TemplateRef<T>): void {
        this.elementRefMap.set(el, templateRef.elementRef);
        this.templateRefMap.set(el, templateRef);
    }
    bindingElementRef<T>(el: RNode, elementRef: ElementRef<T>): void {
        this.elementRefMap.set(el, elementRef);
    }



    /**
     * has destoryed or not.
     *
     * @readonly
     * @type {boolean}
     * @memberof EmbeddedViewRefImpl
     */
    get destroyed(): boolean {
        return this._isDestroyed;
    }

    /**
     * destroy this.
     *
     * @memberof EmbeddedViewRefImpl
     */
    destroy(): void {
        if (this._isDestroyed) return;

        // 标记为已销毁
        this._isDestroyed = true;

        // 清理指令和组件
        // this.directives.forEach(d => {
        //     if (d.destroy) {
        //         d.destroy();
        //     }
        // });
        // this.components.forEach(c => {
        //     if (c.destroy) {
        //         c.destroy();
        //     }
        // });

        // 执行所有销毁回调
        this._destroyCallbacks.forEach(callback => callback());
        this._destroyCallbacks = [];

        // 清理响应式副作用
        if (this.effect) {
            this.effect.stop();
        }

        // 清理节点引用
        // this.nodeRefs.clear();
    }

    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback: () => void): void {
        if (this._isDestroyed) {
            // 如果已销毁，立即执行回调
            callback();
        } else {
            this._destroyCallbacks.push(callback);
        }
    }

    query<T>(selector: Type<T>): ComponentRef<T> | DirectiveRef<T> | null;
    query<C>(selector: string): ElementRef<C> | ViewRef<C> | TemplateRef<C> | null;
    query(selector: string | Type): any {
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
        for (const r of this.rootNodes) {
            const node = r.querySelector(sel);
            if (node) {
                if (def) {
                    if (def.nodeType === NodeType.Container) {
                        return this.componentRefMap.get(node) ?? this.directiveRefMap.get(node) ?? null
                    }
                    return this.directiveRefMap.get(node) ?? null;
                }

                return this.templateRefMap.get(node) ?? this.getElementRef(node);
            }
        }
        return null;
    }

    protected getElementRef(node: RNode): ElementRef {
        let elRef = this.elementRefMap.get(node);
        if (!elRef) {
            elRef = createElementRef(node);
            this.elementRefMap.set(node, elRef);
        }
        return elRef;

    }


    queryAll<T>(selector: Type<T>): Array<ComponentRef<T> | DirectiveRef<T>>;
    queryAll<C>(selector: string): Array<ElementRef<C> | ViewRef<C> | TemplateRef<C>>;
    queryAll(selector: string | Type): Array<any> {
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
        return this.rootNodes.flatMap(r => r.querySelectorAll(sel))
            .filter(n=> n !== null)
            .map(node=> {
                if (def && def.nodeType) {
                    if (def.nodeType === NodeType.Container) {
                        return this.componentRefMap.get(node) ?? this.directiveRefMap.get(node)
                    }
                    return this.directiveRefMap.get(node);
                }

                return this.templateRefMap.get(node) ?? this.getElementRef(node);
            });
    }

}

export function createEmbeddedViewRef<C>(
    rootNodes: RNode[],
    context: C,
    effect: ReactiveEffect) {
    return new EmbeddedViewRefImpl(rootNodes, context, effect)

}
