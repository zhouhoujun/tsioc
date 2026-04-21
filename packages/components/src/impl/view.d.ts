import { Type } from '@tsdi/ioc';
import { ReactiveEffect, noReact } from '../effect';
import { ComponentRef } from '../refs/component';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { RNode } from '../renderer/Node';
import { DirectiveRef } from '../refs/directive';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';
import { NodeInjector } from '../refs/injector';
/**
 * Embedded view ref implement.
 *
 * @export
 * @class EmbeddedViewRefImpl
 * @extends {ViewRefImpl}
 * @implements {EmbeddedViewRef<C>}
 * @template C
 */
export declare class EmbeddedViewRefImpl<C> implements EmbeddedViewRef<C> {
    readonly rootNodes: RNode[];
    readonly context: C;
    readonly injector: NodeInjector;
    [noReact]: boolean;
    private _isDestroyed;
    private _destroyCallbacks;
    readonly effect: ReactiveEffect;
    readonly computedCache: Map<string, {
        value: any;
        deps: Set<any>;
    }>;
    /**
     * Creates an instance of EmbeddedViewRefImpl.
     * @param {RNode[]} rootNodes
     * @param {C} context
     * @param {ReactiveEffect} effect
     * @memberof EmbeddedViewRefImpl
     */
    constructor(rootNodes: RNode[], context: C, injector: NodeInjector, effect?: ReactiveEffect);
    /**
     * has destoryed or not.
     *
     * @readonly
     * @type {boolean}
     * @memberof EmbeddedViewRefImpl
     */
    get destroyed(): boolean;
    /**
     * destroy this.
     *
     * @memberof EmbeddedViewRefImpl
     */
    destroy(): void;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback?: () => void): void;
    query<T>(selector: Type<T>): ComponentRef<T> | DirectiveRef<T> | null;
    query<C>(selector: string): ElementRef<C> | ViewRef<C> | TemplateRef<C> | null;
    queryAll<T>(selector: Type<T>): Array<ComponentRef<T> | DirectiveRef<T>>;
    queryAll<C>(selector: string): Array<ElementRef<C> | ViewRef<C> | TemplateRef<C>>;
}
export declare function createEmbeddedViewRef<C>(rootNodes: RNode[], context: C, injector: NodeInjector, effect?: ReactiveEffect): EmbeddedViewRefImpl<C>;
