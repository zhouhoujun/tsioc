import { getDef, isString, Type } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentDef, ComponentRef } from '../refs/component';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { RNode } from '../renderer/Node';
import { DirectiveRef } from '../refs/directive';
import { ElementRef } from '../refs/element';
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
    // private nodeRefs: Map<string, RNode> = new Map();
    readonly directives = new Set<any>();
    readonly components = new Set<any>();
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
        this.directives.forEach(d => {
            if (d.destroy) {
                d.destroy();
            }
        });
        this.components.forEach(c => {
            if (c.destroy) {
                c.destroy();
            }
        });

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
        const sel = isString(selector) ? selector : getDef<ComponentDef>(selector).selector;
        if (!sel) {
            return null;
        }
        for (const r of this.rootNodes) {
            const node = r.querySelector(sel);
            if (node) {
                return node;
            }
        }
        return null;
    }


    queryAll<T>(selector: Type<T>): Array<ComponentRef<T> | DirectiveRef<T>>;
    queryAll<C>(selector: string): Array<ElementRef<C> | ViewRef<C> | TemplateRef<C>>;
    queryAll(selector: string | Type): Array<any> {
        const sel = isString(selector) ? selector : getDef<ComponentDef>(selector).selector;
        if (!sel) {
            return [];
        }
        return this.rootNodes.flatMap(r => r.querySelectorAll(sel));
    }

}

export function createEmbeddedViewRef<C>(
    rootNodes: RNode[],
    context: C,
    effect: ReactiveEffect) {
    return new EmbeddedViewRefImpl(rootNodes, context, effect)

}
