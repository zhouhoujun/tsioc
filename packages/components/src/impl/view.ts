import { getDef, isString, Type } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentDef } from '../refs/component';
import { EmbeddedViewRef } from '../refs/view';
import { RNode } from '../renderer/Node';

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
    private nodeRefs: Map<string, RNode> = new Map();
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
        this.nodeRefs.clear();
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

    /**
     * Register node reference.
     *
     * @param {string} id
     * @param {RNode} node
     * @memberof EmbeddedViewRefImpl
     */
    registerNodeRef(id: string, node: RNode): void {
        this.nodeRefs.set(id, node);
    }

    /**
     * Get node reference by id.
     *
     * @param {string} id
     * @returns {(RNode | undefined)}
     * @memberof EmbeddedViewRefImpl
     */
    getNodeRef(id: string): RNode | undefined {
        return this.nodeRefs.get(id);
    }

    query<T>(selector: string | Type<T>): T | null {
        const sel = isString(selector) ? selector : getDef<ComponentDef>(selector).selector;
        if (!sel) {
            return null;
        }
        for (const r of this.rootNodes) {
            const node = r.querySelector(sel);
            if (node) {
                return node as T;
            }
        }
        return null;
    }

    queryAll<T>(selector: string | Type<T>): T[] {
        const sel = isString(selector) ? selector : getDef<ComponentDef>(selector).selector;
        if (!sel) {
            return [];
        }
        return this.rootNodes.flatMap(r => r.querySelectorAll(sel) as T[]);
    }

}


export class RootViewRef<C = any> extends EmbeddedViewRefImpl<C> {




}