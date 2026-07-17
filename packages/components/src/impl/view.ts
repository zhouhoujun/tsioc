import { Type } from '@tsdi/ioc';
import { ReactiveEffect, noReact } from '../effect';
import { ComponentRef } from '../refs/component';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { RNode } from '../renderer/Node';
import { DirectiveRef } from '../refs/directive';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';
import { NodeInjector } from '../refs/injector';
import { LOCAL_REFS } from '../renderer/Node';

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

    [noReact] = true;

    private _isDestroyed = false;
    private _destroyCallbacks: (() => void)[] = [];



    readonly effect: ReactiveEffect;
    // 添加计算属性缓存
    readonly computedCache = new Map<string, { value: any, deps: Set<any> }>();
    private _localRefIndex?: Map<string, RNode>;

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
        readonly injector: NodeInjector,
        effect?: ReactiveEffect
    ) {
        this.effect = effect ?? injector.get(ReactiveEffect);
        injector.onDestroy(this);
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

        this.injector.detachNodes(this.rootNodes);

        // 执行所有销毁回调
        this._destroyCallbacks.forEach(callback => callback());
        this._destroyCallbacks = [];

        // // 清理响应式副作用
        // if (this.effect) {
        //     this.effect.stop();
        // }
        // this.injector.destroy();
    }

    get localRefIndex(): Map<string, RNode> {
        if (!this._localRefIndex) {
            this._localRefIndex = new Map<string, RNode>();
            const visit = (nodes: RNode[]) => {
                for (const node of nodes) {
                    const refs = (node as any)[LOCAL_REFS] as string[] | undefined;
                    if (refs?.length) {
                        refs.forEach(ref => {
                            const key = ref.toLowerCase();
                            if (!this._localRefIndex!.has(key)) {
                                this._localRefIndex!.set(key, node);
                            }
                        });
                    }
                    const children = (node as any)?.childNodes as RNode[] | undefined;
                    if (children?.length) {
                        visit(children);
                    }
                }
            };
            visit(this.rootNodes);
        }
        return this._localRefIndex;
    }

    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback?: () => void): void {
        if (callback) {
            this._destroyCallbacks.push(callback);
            return;
        }
        this.destroy();
    }

    query<T>(selector: Type<T>): ComponentRef<T> | DirectiveRef<T> | null;
    query<C>(selector: string): ElementRef<C> | ViewRef<C> | TemplateRef<C> | null;
    query(selector: string | Type): any {        
       return this.injector.query(selector as any, this.rootNodes)
    }


    queryAll<T>(selector: Type<T>): Array<ComponentRef<T> | DirectiveRef<T>>;
    queryAll<C>(selector: string): Array<ElementRef<C> | ViewRef<C> | TemplateRef<C>>;
    queryAll(selector: string | Type): Array<any> {
       return this.injector.queryAll(selector as any, this.rootNodes)
    }

}

export function createEmbeddedViewRef<C>(
    rootNodes: RNode[],
    context: C,
    injector: NodeInjector,
    effect?: ReactiveEffect) {
    return new EmbeddedViewRefImpl(rootNodes, context, injector, effect)

}
