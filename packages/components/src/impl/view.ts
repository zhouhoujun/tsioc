import { getDef, isString, Type } from '@tsdi/ioc';
import { ReactiveEffect, noReact } from '../effect';
import { ComponentDef, ComponentRef } from '../refs/component';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { RNode } from '../renderer/Node';
import { DirectiveDef, DirectiveRef, DirectiveType } from '../refs/directive';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';
import { EnvironmentContext } from '../refs/environment';
import { Renderer } from '../renderer/Renderer';

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
        environment.onDestroy(this);
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

        const node = this.environment.get(Renderer).querySelector(this.rootNodes, sel);
        if (node) {
            if (def && def.dirType) {
                if (def.dirType === DirectiveType.Component) {
                    return this.environment.getComponentRefByNode(node) ?? null
                }
                return this.environment.getDirectiveRefByNode(node) ?? null;
            }

            return this.environment.getTemplateRef(node) ?? this.environment.getElementRef(node);
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
        const nodes = this.environment.get(Renderer).querySelectorAll(this.rootNodes, sel);
        if (!nodes) {
            return [];
        }

        return nodes.map(node => {
            if (def && def.dirType) {
                if (def.dirType === DirectiveType.Component) {
                    return this.environment.getComponentRefByNode(node) ?? null
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
    environment: EnvironmentContext,
    effect?: ReactiveEffect) {
    return new EmbeddedViewRefImpl(rootNodes, context, environment, effect)

}
