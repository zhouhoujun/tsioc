

import { getDef, InvocationContext, isFunction, isNumber, Type } from '@tsdi/ioc';
import { ViewContainerRef } from '../refs/container';
import { ComponentDef, ComponentRef } from '../refs/component';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { TemplateRef } from '../refs/template';
import { Factoriable } from '../refs/directive';
import { RNode } from '../renderer/Node';
import { EnvironmentContext } from '../refs/environment';

/**
 * View container ref implement.
 *
 * @export
 * @class ViewContainerRefImpl
 * @implements {ViewContainerRef}
 */
class ViewContainerRefImpl implements ViewContainerRef {

    /**
     * view list.
     *
     * @type {(Array<ViewRef>)}
     * @memberof ViewContainerRefImpl
     */
    private views: Array<ViewRef> = [];

    /**
     * Creates an instance of ViewContainerRefImpl.
     * @param {ElementRef} element
     * @param {EnvironmentContext} environment
     * @memberof ViewContainerRefImpl
     */
    constructor(
        readonly element: ElementRef,
        readonly environment: EnvironmentContext,
    ) { }

    private _renderer?: Renderer;
    get renderer(): Renderer {
        if (!this._renderer) {
            this._renderer = this.environment.get(Renderer);
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

    createEmbeddedView<C>(templateRef: TemplateRef<C>, context?: C, index?: number): EmbeddedViewRef<C>;
    createEmbeddedView<C>(templateRef: TemplateRef<C>, context?: C, options?: {
        index?: number,
        environment?: EnvironmentContext
    }): EmbeddedViewRef<C>;
    createEmbeddedView<C>(templateRef: TemplateRef<C>, context?: C, opts?: { index?: number } | number): EmbeddedViewRef<C> {
        const options = (isNumber(opts) ? { index: opts } : opts) as {
            index?: number,
            environment?: EnvironmentContext
        };
        const view = templateRef.createEmbeddedView(context!, options?.environment || this.environment);
        const index = options?.index !== undefined ? options.index : this.views.length;
        this.insert(view, index);
        return view;
    }

    createComponent<C>(componentType: Type<C> | ComponentDef<C>, options?: {
        index?: number,
        environment?: EnvironmentContext,
    }): ComponentRef<C> {
        const def = isFunction(componentType) ? getDef(componentType) : componentType;
        const componentRef = (def as Factoriable).ƿfac!(options?.environment || this.environment, {}) as ComponentRef<C>;
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

        // Insert view into views array
        this.views.splice(insertIndex, 0, viewRef);

        // Insert DOM nodes
        const nativeElement = this.element.nativeElement;
        const viewNodes = viewRef.rootNodes;
        const nextSibling = this.getNextSibling(insertIndex);

        if (nextSibling) {
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

        // Remove view from old position
        this.views.splice(oldIndex, 1);

        // Insert view into new position
        this.views.splice(newIndex, 0, viewRef);

        // Move DOM nodes
        const nativeElement = this.element.nativeElement;
        const viewNodes = viewRef.rootNodes;
        const nextSibling = this.getNextSibling(newIndex);

        // Remove nodes first
        viewNodes.forEach(node => {
            if (node.parentNode === nativeElement) {
                nativeElement.removeChild(node);
            }
        });

        // Insert nodes at new position
        if (nextSibling) {
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

        // Remove DOM nodes
        viewNodes.forEach(node => {
            this.renderer.removeChild(nativeElement, node);
        });

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

export function createViewContainerRef(elementRef: ElementRef, environment: EnvironmentContext): ViewContainerRef {
    return new ViewContainerRefImpl(elementRef, environment);
}
