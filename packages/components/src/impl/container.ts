import { getDef, isFunction, isNumber, Type } from '@tsdi/ioc';
import { ViewContainerRef } from '../refs/container';
import { ComponentDef, ComponentRef } from '../refs/component';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { TemplateRef } from '../refs/template';
import { Factoriable } from '../refs/directive';
import { NodeType, RNode } from '../renderer/Node';
import { NodeInjector } from '../refs/injector';
import { noReact, ReactiveEffect } from '../effect';

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

    private _isElementContainer?: boolean;
    protected get isElementContainer(): boolean {
        if (this._isElementContainer === undefined) {
            this._isElementContainer = ((this.element.nativeElement as RNode).nodeType & NodeType.ElementContainer) === NodeType.ElementContainer;
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
        while (this.views.length > 0) {
            this.remove(0);
        }
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
    }): ComponentRef<C> {
        const def = isFunction(componentType) ? getDef(componentType) : componentType;
        const componentRef = (def as Factoriable).ƿfac!(options?.injector || this.injector, {}) as ComponentRef<C>;
        const insertIndex = options?.index !== undefined ? options?.index : this.views.length;
        componentRef.render()
            .then(() => {
                this.insert(componentRef.hostView, insertIndex);
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

        // Insert DOM nodes
        const nativeElement = this.element.nativeElement;
        const viewNodes = viewRef.rootNodes;

        if (this.isElementContainer) {
            // For ElementContainer, views are inserted as siblings of the container (anchor)
            // The container acts as an anchor point - views are inserted before it (or after previous views)
            // First try injector.getParentNode, then try nativeElement.parentNode
            let parentNode = this.injector.getParentNode(nativeElement);

            // If stored parent is from template AST (not connected to rendered DOM),
            // use the actual DOM parentNode instead
            if (!parentNode) {
                parentNode = nativeElement.parentNode;
            }

            if (parentNode) {
                const prefersLocalChildren = nativeElement?.constructor?.name === 'ConsoleElement';
                if (prefersLocalChildren) {
                    if (nextSibling && nextSibling.parentNode === nativeElement) {
                        viewNodes.forEach(node => {
                            nativeElement.insertBefore(node, nextSibling);
                        });
                    } else {
                        viewNodes.forEach(node => {
                            nativeElement.appendChild(node);
                        });
                    }
                    return viewRef;
                }
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
        const oldIndex = this.views.indexOf(viewRef);
        if (oldIndex < 0 || oldIndex >= this.views.length || newIndex < 0 || newIndex >= this.views.length || oldIndex === newIndex) {
            return viewRef;
        }

        const nextSibling = this.getNextSibling(newIndex);
        // Remove view from old position
        this.views.splice(oldIndex, 1);

        // Insert view into new position
        this.views.splice(newIndex, 0, viewRef);

        // Move DOM nodes
        const nativeElement = this.element.nativeElement;
        const viewNodes = viewRef.rootNodes;
        // Use injector.getParentNode to get the correct parent for cloned templates
        const parentNode = this.injector.getParentNode(nativeElement) || nativeElement.parentNode;

        // Remove nodes from their current position
        if (this.isElementContainer && parentNode) {
            viewNodes.forEach(node => {
                if (node.parentNode === parentNode) {
                    parentNode.removeChild(node);
                }
            });
        } else {
            viewNodes.forEach(node => {
                if (node.parentNode === nativeElement) {
                    nativeElement.removeChild(node);
                }
            });
        }

        // Insert nodes at new position
        if (this.isElementContainer) {
            if (parentNode) {
                if (nextSibling) {
                    viewNodes.forEach(node => {
                        parentNode.insertBefore(node, nextSibling);
                    });
                } else {
                    viewNodes.forEach(node => {
                        parentNode.insertBefore(node, nativeElement);
                    });
                }
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
     * Returns the index of a view within the container.
     *
     * @template C
     * @param {ViewRef} viewRef
     * @returns {number} The index of the view or -1 if the view is not found.
     * @memberof ViewContainerRefImpl
     */
    indexOf(viewRef: ViewRef): number {
        return this.views.indexOf(viewRef);
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
        const viewNodes = viewRef.rootNodes;
        const nativeElement = this.element.nativeElement;
        // Use injector.getParentNode to get the correct parent for cloned templates
        const parentNode = this.injector.getParentNode(nativeElement) || nativeElement.parentNode;

        // Remove DOM nodes
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

        // Remove view from views array
        this.views.splice(removeIndex, 1);

        // Destroy the view
        if ('destroy' in viewRef) {
            (viewRef as any).destroy();
        }
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
