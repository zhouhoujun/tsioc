import { getDef, isFunction, isNumber, Type } from '@tsdi/ioc';
import { ViewContainerRef } from '../refs/container';
import { ComponentDef, ComponentRef } from '../refs/component';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { TemplateCompiler } from '../template/compiler';
import { TemplateRef } from '../refs/template';
import { Factoriable } from '../refs/directive';
import { RNode } from '../renderer/Node';
import { NodeInjector } from '../refs/injector';
import { noReact, ReactiveEffect } from '../effect';
import { isStructuralContainer } from './structural-container';

/**
 * View container ref implement.
 *
 * @export
 * @class ViewContainerRefImpl
 * @implements {ViewContainerRef}
 */
class ViewContainerRefImpl implements ViewContainerRef {

    [noReact] = true;

    /**
     * view list.
     *
     * @type {(Array<ViewRef>)}
     * @memberof ViewContainerRefImpl
     */
    private views: Array<ViewRef> = [];
    private viewIndex = new Map<ViewRef, number>();

    private reindex(from = 0): void {
        for (let i = from; i < this.views.length; i++) {
            this.viewIndex.set(this.views[i], i);
        }
    }

    private removeViewNodes(viewRef: ViewRef): void {
        const viewNodes = viewRef.rootNodes;
        const nativeElement = this.element.nativeElement;
        const parentNode = this.resolveContainerParent();
        if (this.injector.destroyed) {
            return;
        }
        if (this.isElementContainer && parentNode) {
            viewNodes.forEach(node => {
                if (node.parentNode === parentNode) {
                    this.renderer.removeChild(parentNode, node);
                }
            });
        } else {
            viewNodes.forEach(node => {
                if (node.parentNode === nativeElement) {
                    this.renderer.removeChild(nativeElement, node);
                }
            });
        }
    }

    private _isElementContainer?: boolean;
    protected get isElementContainer(): boolean {
        if (this._isElementContainer === undefined) {
            // `ElementContainer` is only assignable on virtual nodes; real DOM
            // elements keep their read-only nodeType. Fall back to the anchor's
            // tag/attribute so DOM views are inserted as siblings of the anchor
            // (matching the virtual renderers) instead of being nested inside it.
            this._isElementContainer = isStructuralContainer(this.element.nativeElement as RNode);
        }
        return this._isElementContainer;
    }

    /**
     * Creates an instance of ViewContainerRefImpl.
     * @param {ElementRef} element
     * @param {NodeInjector} injector
     * @memberof ViewContainerRefImpl
     */
    constructor(
        readonly element: ElementRef,
        readonly injector: NodeInjector,
    ) {

    }

    private _renderer?: Renderer;
    get renderer(): Renderer {
        if (!this._renderer) {
            this._renderer = this.injector.get(Renderer);
        }
        return this._renderer;
    }

    private resolveContainerParent(): RNode | null {
        const nativeElement = this.element.nativeElement;
        const storedParent = this.injector.getParentNode(nativeElement);
        const actualParent = nativeElement.parentNode;
        return actualParent || storedParent || null;
    }
    /**
     * Returns the number of views currently attached to this container.
     *
     * @readonly
     * @memberof ViewContainerRefImpl
     */
    get length(): number {
        return this.views.length;
    }

    /**
     * Destroys all views in this container.
     *
     * @memberof ViewContainerRefImpl
     */
    clear(): void {
        const views = this.views.splice(0);
        this.viewIndex.clear();
        views.forEach(view => {
            this.removeViewNodes(view);
            if ('destroy' in view) {
                (view as any).destroy();
            }
        });
    }

    /**
     * Retrieves a view from this container.
     *
     * @param {number} index
     * @returns {(ComponentRef<C> | EmbeddedViewRef<C>)} The ViewRef instance, or null if the index is out of range.
     * @memberof ViewContainerRefImpl
     */
    get(index: number): ViewRef | null {
        if (index >= 0 && index < this.views.length) {
            return this.views[index] as ViewRef;
        }
        return null;
    }

    createEmbeddedView<C>(templateRef: TemplateRef<C>, context: C, index?: number): EmbeddedViewRef<C>;
    createEmbeddedView<C>(templateRef: TemplateRef<C>, context: C, options?: {
        index?: number,
        injector?: NodeInjector,
        effect?: ReactiveEffect
    }): EmbeddedViewRef<C>;
    createEmbeddedView<C>(templateRef: TemplateRef<C>, context: C, opts?: { index?: number } | number): EmbeddedViewRef<C> {
        const options = (isNumber(opts) ? { index: opts } : opts) as {
            index?: number,
            injector?: NodeInjector,
            effect?: ReactiveEffect
        };
        const view = templateRef.createEmbeddedView(context, options?.injector || this.injector, options?.effect);
        const index = options?.index !== undefined ? options.index : this.views.length;
        this.insert(view, index);
        return view;
    }

    createComponent<C>(componentType: Type<C> | ComponentDef<C>, options?: {
        index?: number,
        injector?: NodeInjector,
        inputs?: Partial<C>,
        onError?: (error: unknown) => void,
    }): ComponentRef<C> {
        const def = isFunction(componentType) ? getDef(componentType) : componentType;
        const injector = options?.injector || this.injector;
        const renderer = injector.get(Renderer, null) || undefined;
        const compiler = injector.get(TemplateCompiler, null) || undefined;
        const componentRef = (def as Factoriable).ƿfac!(injector, {
            renderer,
            compiler
        } as any) as ComponentRef<C>;
        if (options?.inputs) {
            Object.assign(componentRef.instance as object, options.inputs);
        }
        const insertIndex = options?.index !== undefined ? options?.index : this.views.length;
        const renderTask = componentRef.render();
        renderTask
            .then(() => {
                const hostView = componentRef.hostView;
                if (this.injector.destroyed || !hostView || hostView.destroyed) {
                    (componentRef as any).destroy?.();
                    return;
                }
                if (this.indexOf(hostView) >= 0) {
                    return;
                }
                const index = Math.max(0, Math.min(insertIndex, this.views.length));
                this.insert(hostView, index);
            })
            .catch(error => {
                try {
                    (componentRef as any).destroy?.();
                } catch {
                    // The render failure is the actionable error below.
                }
                if (options?.onError) {
                    options.onError(error);
                    return;
                }
                throw error;
            });
        return componentRef;
    }

    /**
     * Inserts a view into this container.
     *
     * @template C
     * @param {(ComponentRef<C> | EmbeddedViewRef<C>)} viewRef
     * @param {number} [index]
     * @returns {this}
     * @memberof ViewContainerRefImpl
     */
    insert(viewRef: ViewRef, index?: number): ViewRef {
        let insertIndex = index !== undefined ? index : this.views.length;
        insertIndex = Math.max(0, Math.min(insertIndex, this.views.length));

        // Get next sibling BEFORE adding the view to the array
        const nextSibling = this.getNextSibling(insertIndex);
        // Insert view into views array
        this.views.splice(insertIndex, 0, viewRef);
        this.reindex(insertIndex);

        // Insert DOM nodes
        const nativeElement = this.element.nativeElement;
        const viewNodes = viewRef.rootNodes;

        if (this.isElementContainer) {
            // For ElementContainer, views are inserted as siblings of the container (anchor)
            // The container acts as an anchor point - views are inserted before it (or after previous views)
            const parentNode = this.resolveContainerParent();

            if (parentNode) {
                if (nextSibling) {
                    viewNodes.forEach(node => {
                        parentNode.insertBefore(node, nextSibling);
                    });
                } else {
                    if (insertIndex > 0) {
                        const prevView = this.views[insertIndex - 1];
                        const prevViewNodes = prevView.rootNodes;
                        const lastPrevNode = prevViewNodes[prevViewNodes.length - 1];
                        viewNodes.forEach(node => {
                            if (lastPrevNode.nextSibling) {
                                parentNode.insertBefore(node, lastPrevNode.nextSibling);
                            } else {
                                parentNode.insertBefore(node, nativeElement);
                            }
                        });
                    } else {
                        viewNodes.forEach(node => {
                            parentNode.insertBefore(node, nativeElement);
                        });
                    }
                }
            } else {
                console.error('[INSERT] No parentNode for ElementContainer, nativeElement:', nativeElement.tagName);
            }
        } else {
            if (nextSibling) {
                viewNodes.forEach(node => {
                    nativeElement.insertBefore(node, nextSibling);
                });
            } else {
                viewNodes.forEach(node => {
                    nativeElement.appendChild(node);
                });
            }
        }

        return viewRef;
    }

    /**
     * Moves a view to a new position in this container.
     *
     * @param {number} oldIndex
     * @param {number} newIndex
     * @returns {this}
     * @memberof ViewContainerRefImpl
     */
    move(viewRef: ViewRef, newIndex: number): ViewRef {
        const oldIndex = this.indexOf(viewRef);
        if (oldIndex < 0 || newIndex < 0) {
            return viewRef;
        }
        const targetIndex = Math.min(newIndex, this.views.length - 1);
        if (oldIndex === targetIndex) {
            return viewRef;
        }

        // Remove first, then insert through the normal path so nextSibling is
        // computed against the post-removal order (a previous implementation
        // computed it before removal and swapped the order for forward moves).
        this.removeViewNodes(viewRef);
        this.views.splice(oldIndex, 1);
        this.viewIndex.delete(viewRef);
        this.reindex(oldIndex);
        this.insert(viewRef, targetIndex);
        return viewRef;
    }

    /**
     * Returns the index of a view within the container.
     *
     * @template C
     * @param {ViewRef} viewRef
     * @returns {number} The index of the view or -1 if the view is not found.
     * @memberof ViewContainerRefImpl
     */
    indexOf(viewRef: ViewRef): number {
        return this.viewIndex.get(viewRef) ?? -1;
    }

    /**
     * Destroys a view attached to this container
     *
     * @param {number} [index]
     * @returns {void}
     * @memberof ViewContainerRefImpl
     */
    remove(index?: number): void {
        const removeIndex = index !== undefined ? index : this.views.length - 1;
        if (removeIndex < 0 || removeIndex >= this.views.length) {
            return;
        }

        const viewRef = this.views[removeIndex];

        // Remove DOM nodes. Guard: on a destroyed injector the lazy renderer
        // getter throws (assertNotDestroyed) during directive onDestroy; the
        // teardown DOM removal is then handled by detachNodes the parent.
        this.removeViewNodes(viewRef);

        // Remove view from views array
        this.views.splice(removeIndex, 1);
        this.viewIndex.delete(viewRef);
        this.reindex(removeIndex);

        // Destroy the view
        if ('destroy' in viewRef) {
            (viewRef as any).destroy();
        }
    }

    detach(index: number): ViewRef | null {
        if (index < 0 || index >= this.views.length) {
            return null;
        }
        const viewRef = this.views[index];
        this.removeViewNodes(viewRef);
        this.views.splice(index, 1);
        this.viewIndex.delete(viewRef);
        this.reindex(index);
        return viewRef;
    }

    reattach(viewRef: ViewRef, index?: number): ViewRef {
        if (this.viewIndex.has(viewRef)) {
            return viewRef;
        }
        return this.insert(viewRef, index);
    }

    getHostElement(index: number): RNode | null {
        return this.views[index]?.rootNodes?.[0] ?? null;
    }


    /**
     * Get next sibling element.
     *
     * @private
     * @param {number} index
     * @returns {Node}
     * @memberof ViewContainerRefImpl
     */
    private getNextSibling(index: number): RNode | null {
        if (index >= this.views.length) {
            return null;
        }

        const nextView = this.views[index];
        const nextViewNodes = nextView.rootNodes;
        return nextViewNodes.length > 0 ? nextViewNodes[0] : null;
    }
}

export function createViewContainerRef(elementRef: ElementRef, injector: NodeInjector): ViewContainerRef {
    return new ViewContainerRefImpl(elementRef, injector);
}
