import { ReactiveEffect } from '../ReactiveEffect';
import { ComponentRef } from '../refs/component';
import { ViewRef } from '../refs/view';
import { RNode } from '../renderer/Node';

export class RootViewRef extends ViewRef {
    private _isDestroyed = false;
    private _destroyCallbacks: (() => void)[] = [];
    private nodeRefs: Map<string, RNode> = new Map();
    readonly directives = new Set<ComponentRef<any>>;
    readonly components = new Set<ComponentRef<any>>;

    // 添加计算属性缓存
    readonly computedCache = new Map<string, { value: any, deps: Set<any> }>();


    get destroyed(): boolean {
        return this._isDestroyed;
    }

    destroy(): void {
        if (this._isDestroyed) return;

        // 标记为已销毁
        this._isDestroyed = true;

        this.directives?.forEach(d => d.destroy());
        this.components?.forEach(d => d.destroy());

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

    onDestroy(callback: () => void): void {
        if (this._isDestroyed) {
            // 如果已销毁，立即执行回调
            callback();
        } else {
            this._destroyCallbacks.push(callback);
        }
    }

    registerNodeRef(id: string, node: RNode): void {
        this.nodeRefs.set(id, node);
    }

    getNodeRef(id: string): RNode | undefined {
        return this.nodeRefs.get(id);
    }

    constructor(
        readonly rootNodes: RNode[],
        readonly context: any,
        readonly effect: ReactiveEffect
    ) {
        super();
    }

}