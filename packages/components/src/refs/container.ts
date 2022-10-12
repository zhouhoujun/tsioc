import { ModuleRef } from '@tsdi/core';
import { Abstract, Injector, InvocationContext, Type, TypeDef } from '@tsdi/ioc';
import { ComponentRef } from './component';
import { ElementRef } from './element';
import { TemplateRef } from './template';
import { EmbeddedViewRef, ViewRef } from './view';


/**
 * Represents a container where one or more views can be attached to a component.
 *
 * Can contain *host views* (created by instantiating a
 * component with the `createComponent()` method), and *embedded views*
 * (created by instantiating a `TemplateRef` with the `createEmbeddedView()` method).
 *
 * A view container instance can contain other view containers,
 * creating a [view hierarchy]
 *
 * @see `ComponentRef`
 * @see `EmbeddedViewRef`
 *
 * @publicApi
 */
@Abstract()
export abstract class ViewContainerRef {
    /**
     * Anchor element that specifies the location of this container in the containing view.
     * Each view container can have only one anchor element, and each anchor element
     * can have only a single view container.
     *
     * Root elements of views attached to this container become siblings of the anchor element in
     * the rendered view.
     *
     * Access the `ViewContainerRef` of an element by placing a `Directive` injected
     * with `ViewContainerRef` on the element, or use a `ViewChild` query.
     *
     * <!-- TODO: rename to anchorElement -->
     */
    abstract get element(): ElementRef;

    /**
     * The [dependency injector] for this view container.
     */
    abstract get injector(): Injector;

    /**
     * Destroys all views in this container.
     */
    abstract clear(): void;

    /**
     * Retrieves a view from this container.
     * @param index The 0-based index of the view to retrieve.
     * @returns The `ViewRef` instance, or null if the index is out of range.
     */
    abstract get(index: number): ViewRef | null;

    /**
     * Reports how many views are currently attached to this container.
     * @returns The number of views.
     */
    abstract get length(): number;

    /**
     * Instantiates an embedded view and inserts it
     * into this container.
     * @param templateRef The HTML template that defines the view.
     * @param context The data-binding context of the embedded view, as declared
     * in the `<template>` usage.
     * @param options Extra configuration for the created view. Includes:
     *  * index: The 0-based index at which to insert the new view into this container.
     *           If not specified, appends the new view as the last entry.
     *  * injector: Injector to be used within the embedded view.
     *
     * @returns The `ViewRef` instance for the newly created view.
     */
    abstract createEmbeddedView<C>(templateRef: TemplateRef<C>, context?: C, options?: {
        index?: number,
        injector?: Injector
    }): EmbeddedViewRef<C>;

    /**
     * Instantiates an embedded view and inserts it
     * into this container.
     * @param templateRef The HTML template that defines the view.
     * @param context The data-binding context of the embedded view, as declared
     * in the `<template>` usage.
     * @param index The 0-based index at which to insert the new view into this container.
     * If not specified, appends the new view as the last entry.
     *
     * @returns The `ViewRef` instance for the newly created view.
     */
    abstract createEmbeddedView<C>(templateRef: TemplateRef<C>, context?: C, index?: number): EmbeddedViewRef<C>;

    /**
     * Instantiates a single component and inserts its host view into this container.
     *
     * @param componentType Component Type to use.
     * @param options An object that contains extra parameters:
     *  * index: the index at which to insert the new component's host view into this container.
     *           If not specified, appends the new view as the last entry.
     *  * injector: the injector to use as the parent for the new component.
     *  * moduleRef: an ModuleRef of the component's Module, you should almost always provide
     *                 this to ensure that all expected providers are available for the component
     *                 instantiation.
     *  * environmentInjector: an EnvironmentInjector which will provide the component's environment.
     *                 you should almost always provide this to ensure that all expected providers
     *                 are available for the component instantiation. This option is intended to
     *                 replace the `moduleRef` parameter.
     *  * projectableNodes: list of DOM nodes that should be projected through
     *                      [`<content>`](api/core/content) of the new component instance.
     *
     * @returns The new `ComponentRef` which contains the component instance and the host view.
     */
    abstract createComponent<C>(componentType: Type<C>|TypeDef<C>, options?: {
        index?: number,
        injector?: Injector,
        moduleRef?: ModuleRef,
        context?: InvocationContext,
        projectableNodes?: Node[][],
    }): ComponentRef<C>;

    /**
     * Inserts a view into this container.
     * @param viewRef The view to insert.
     * @param index The 0-based index at which to insert the view.
     * If not specified, appends the new view as the last entry.
     * @returns The inserted `ViewRef` instance.
     *
     */
    abstract insert(viewRef: ViewRef, index?: number): ViewRef;

    /**
     * Moves a view to a new location in this container.
     * @param viewRef The view to move.
     * @param index The 0-based index of the new location.
     * @returns The moved `ViewRef` instance.
     */
    abstract move(viewRef: ViewRef, currentIndex: number): ViewRef;

    /**
     * Returns the index of a view within the current container.
     * @param viewRef The view to query.
     * @returns The 0-based index of the view's position in this container,
     * or `-1` if this container doesn't contain the view.
     */
    abstract indexOf(viewRef: ViewRef): number;

    /**
     * Destroys a view attached to this container
     * @param index The 0-based index of the view to destroy.
     * If not specified, the last view in the container is removed.
     */
    abstract remove(index?: number): void;

    /**
     * Detaches a view from this container without destroying it.
     * Use along with `insert()` to move a view within the current container.
     * @param index The 0-based index of the view to detach.
     * If not specified, the last view in the container is detached.
     */
    abstract detach(index?: number): ViewRef | null;

}
