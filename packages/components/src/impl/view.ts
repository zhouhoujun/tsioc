import { getDef, isString, Type } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentDef, ComponentRef } from '../refs/component';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { NodeType, RNode } from '../renderer/Node';
import { DirectiveDef, DirectiveRef } from '../refs/directive';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';
import { EnvironmentContext } from '../refs/environment';

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



    private effect: ReactiveEffect;
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
        readonly rootNodes: RNode[],
        readonly context: C,
        readonly environment: EnvironmentContext,
        effect?: ReactiveEffect
    ) {
        this.effect = effect ?? environment.get(ReactiveEffect);
        environment.setValue(EmbeddedViewRef, this);
        environment.onDestroy(this.destroy.bind(this));
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

        // 执行所有销毁回调
        this._destroyCallbacks.forEach(callback => callback());
        this._destroyCallbacks = [];

        // 清理响应式副作用
        if (this.effect) {
            this.effect.stop();
        }
        this.environment.destroy();
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
                        return this.environment.getComponentRefByNode(node) ?? this.environment.getDirectiveRefByNode(node) ?? null
                    }
                    return this.environment.getDirectiveRefByNode(node) ?? null;
                }

                return this.environment.getTemplateRef(node) ?? this.environment.getElementRef(node);
            }
        }
        return null;
    }

    // protected getElementRef(node: RNode): ElementRef {
    //     let elRef = this.elementRefMap.get(node);
    //     if (!elRef) {
    //         elRef = createElementRef(node);
    //         this.elementRefMap.set(node, elRef);
    //     }
    //     return elRef;

    // }


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
            .filter(n => n !== null)
            .map(node => {
                if (def && def.nodeType) {
                    if (def.nodeType === NodeType.Container) {
                        return this.environment.getComponentRefByNode(node) ?? this.environment.getDirectiveRefByNode(node) ?? null
                    }
                    return this.environment.getDirectiveRefByNode(node) ?? null;
                }

                return this.environment.getTemplateRef(node) ?? this.environment.getElementRef(node);
            });
    }

}

export function createEmbeddedViewRef<C>(
    rootNodes: RNode[],
    context: C,
    environment: EnvironmentContext, effect?: ReactiveEffect) {
    return new EmbeddedViewRefImpl(rootNodes, context, environment, effect)

}
