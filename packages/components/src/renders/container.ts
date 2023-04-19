import { createContext, Injector, ModuleRef, InvocationContext, isFunction, Type, TypeDef } from '@tsdi/ioc';
import { isLContainer } from '../interfaces/chk';
import { IComment, IElement } from '../interfaces/dom';
import { LView, PARENT, RENDERER, TVIEW, T_HOST } from '../interfaces/view';
import { CONTAINER_HEADER_OFFSET, LContainer, NATIVE } from '../interfaces/container';
import { TContainerNode, TDirectiveHostNode, TElementContainerNode, TElementNode, TNodeType } from '../interfaces/node';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';
import { ComponentRef } from '../refs/component';
import { ViewContainerRef } from '../refs/container';
import { EmbeddedViewRef, ViewRef } from '../refs/view';
import { addToArray, removeFromArray } from '../util/array';
import { assertDefined, assertEqual, assertGreaterThan, assertLessThan, throwError } from '../util/assert';
import { getNativeByTNode, unwrapRNode, viewAttachedToContainer } from '../util/view';
import { assertTNodeType } from './assert';
import { createElementRef } from './element';
import { NodeInjector } from './injector';
import { addViewToContainer, destroyLView, getBeforeNodeForView, insertView } from './manipulation';
import { createLContainer } from './share';
import { ViewRefImpl } from './view_ref';

declare let devMode: any;


export class ViewContainerRefImpl extends ViewContainerRef {

    constructor(
        private _lContainer: LContainer,
        private _hostTNode: TElementNode | TContainerNode | TElementContainerNode,
        private _hostLView: LView) {
        super();
    }

    override get element(): ElementRef {
        return createElementRef(this._hostTNode, this._hostLView);
    }

    override get injector(): Injector {
        return new NodeInjector(this._hostTNode, this._hostLView);
    }

    /** @deprecated No replacement */
    override get parentInjector(): Injector {
        const parentLocation = getParentInjectorLocation(this._hostTNode, this._hostLView);
        if (hasParentInjector(parentLocation)) {
            const parentView = getParentInjectorView(parentLocation, this._hostLView);
            const injectorIndex = getParentInjectorIndex(parentLocation);
            // devMode && assertNodeInjector(parentView, injectorIndex);
            const parentTNode =
                parentView[TVIEW].data[injectorIndex + NodeInjectorOffset.TNODE] as TElementNode;
            return new NodeInjector(parentTNode, parentView);
        } else {
            return new NodeInjector(null, this._hostLView);
        }
    }

    override clear(): void {
        while (this.length > 0) {
            this.remove(this.length - 1);
        }
    }

    override get(index: number): ViewRef | null {
        const viewRefs = getViewRefs(this._lContainer);
        return viewRefs !== null && viewRefs[index] || null;
    }

    override get length(): number {
        return this._lContainer.length - CONTAINER_HEADER_OFFSET;
    }

    override createEmbeddedView<C>(templateRef: TemplateRef<C>, context?: C, options?: {
        index?: number,
        injector?: Injector
    }): EmbeddedViewRef<C>;
    override createEmbeddedView<C>(templateRef: TemplateRef<C>, context?: C, index?: number):
        EmbeddedViewRef<C>;
    override createEmbeddedView<C>(templateRef: TemplateRef<C>, context?: C, indexOrOptions?: number | {
        index?: number,
        injector?: Injector
    }): EmbeddedViewRef<C> {
        let index: number | undefined;
        let injector: Injector | undefined;

        if (typeof indexOrOptions === 'number') {
            index = indexOrOptions;
        } else if (indexOrOptions != null) {
            index = indexOrOptions.index;
            injector = indexOrOptions.injector;
        }

        const viewRef = templateRef.createEmbeddedView(context || <any>{}, injector);
        this.insert(viewRef, index);
        return viewRef;
    }

    override createComponent<C>(componentType: Type<C> | TypeDef<C>, options: {
        index?: number,
        injector?: Injector,
        projectableNodes?: Node[][],
        context?: InvocationContext,
        moduleRef?: ModuleRef,
    } = {}): ComponentRef<C> {


        if (devMode) {
            assertDefined(
                getComponentDef(componentFactoryOrType),
                `Provided Component class doesn't contain Component definition. ` +
                `Please check whether provided class has @Component decorator.`);
            assertEqual(
                typeof indexOrOptions !== 'number', true,
                'It looks like Component type was provided as the first argument ' +
                'and a number (representing an index at which to insert the new component\'s ' +
                'host view into this container as the second argument. This combination of arguments ' +
                'is incompatible. Please use an object as the second argument instead.');
        }

        if (devMode && options.context && options.moduleRef) {
            throwError(
                `Cannot pass both context and moduleRef options to createComponent().`);
        }
        // index = options.index;
        // injector = options.injector;
        // projectableNodes = options.projectableNodes;

        let environmentInjector = options.context;


        const componentFactory = new ComponentFactoryImpl(isFunction(componentType));
        const contextInjector = options.injector || this.parentInjector;

        // If an `NgModuleRef` is not provided explicitly, try retrieving it from the DI tree.
        if (!environmentInjector) {
            environmentInjector = createContext(options.moduleRef ?? contextInjector);
        }

        const componentRef =
            componentFactory.create(contextInjector, options.projectableNodes, undefined, environmentInjector);
        this.insert(componentRef.hostView, options.index);
        return componentRef;
    }

    override insert(viewRef: ViewRef, index?: number): ViewRef {
        const lView = (viewRef as ViewRefImpl)._lView!;
        const tView = lView[TVIEW];

        if (devMode && viewRef.destroyed) {
            throw new Error('Cannot insert a destroyed View in a ViewContainer!');
        }

        if (viewAttachedToContainer(lView)) {
            // If view is already attached, detach it first so we clean up references appropriately.

            const prevIdx = this.indexOf(viewRef);

            // A view might be attached either to this or a different container. The `prevIdx` for
            // those cases will be:
            // equal to -1 for views attached to this ViewContainerRef
            // >= 0 for views attached to a different ViewContainerRef
            if (prevIdx !== -1) {
                this.detach(prevIdx);
            } else {
                const prevLContainer = lView[PARENT] as LContainer;
                devMode &&
                    assertEqual(
                        isLContainer(prevLContainer), true,
                        'An attached view should have its PARENT point to a container.');


                // We need to re-create a R3ViewContainerRef instance since those are not stored on
                // LView (nor anywhere else).
                const prevVCRef = new ViewContainerRefImpl(
                    prevLContainer, prevLContainer[T_HOST] as TDirectiveHostNode, prevLContainer[PARENT]);

                prevVCRef.detach(prevVCRef.indexOf(viewRef));
            }
        }

        // Logical operation of adding `LView` to `LContainer`
        const adjustedIdx = this._adjustIndex(index);
        const lContainer = this._lContainer;
        insertView(tView, lView, lContainer, adjustedIdx);

        // Physical operation of adding the DOM nodes.
        const beforeNode = getBeforeNodeForView(adjustedIdx, lContainer);
        const renderer = lView[RENDERER];
        const parentRNode = renderer.parentNode(lContainer[NATIVE] as IElement | IComment);
        if (parentRNode !== null) {
            addViewToContainer(tView, lContainer[T_HOST], renderer, lView, parentRNode, beforeNode);
        }

        (viewRef as ViewRefImpl).attachToViewContainerRef();
        addToArray(getOrCreateViewRefs(lContainer), adjustedIdx, viewRef);

        return viewRef;
    }

    override move(viewRef: ViewRef, newIndex: number): ViewRef {
        if (devMode && viewRef.destroyed) {
            throw new Error('Cannot move a destroyed View in a ViewContainer!');
        }
        return this.insert(viewRef, newIndex);
    }

    override indexOf(viewRef: ViewRef): number {
        const viewRefsArr = getViewRefs(this._lContainer);
        return viewRefsArr !== null ? viewRefsArr.indexOf(viewRef) : -1;
    }

    override remove(index?: number): void {
        const adjustedIdx = this._adjustIndex(index, -1);
        const detachedView = detachView(this._lContainer, adjustedIdx);

        if (detachedView) {
            // Before destroying the view, remove it from the container's array of `ViewRef`s.
            // This ensures the view container length is updated before calling
            // `destroyLView`, which could recursively call view container methods that
            // rely on an accurate container length.
            // (e.g. a method on this view container being called by a child directive's OnDestroy
            // lifecycle hook)
            removeFromArray(getOrCreateViewRefs(this._lContainer), adjustedIdx);
            destroyLView(detachedView[TVIEW], detachedView);
        }
    }

    override detach(index?: number): ViewRef | null {
        const adjustedIdx = this._adjustIndex(index, -1);
        const view = detachView(this._lContainer, adjustedIdx);

        const wasDetached =
            view && removeFromArray(getOrCreateViewRefs(this._lContainer), adjustedIdx) != null;
        return wasDetached ? new ViewRefImpl(view!) : null;
    }

    private _adjustIndex(index?: number, shift = 0) {
        if (index == null) {
            return this.length + shift;
        }
        if (devMode) {
            assertGreaterThan(index, -1, `ViewRef index must be positive, got ${index}`);
            // +1 because it's legal to insert at the end.
            assertLessThan(index, this.length + 1 + shift, 'index');
        }
        return index;
    }
}

/**
 * Creates a ViewContainerRef and stores it on the injector.
 *
 * @param ViewContainerRefToken The ViewContainerRef type
 * @param ElementRefToken The ElementRef type
 * @param hostTNode The node that is requesting a ViewContainerRef
 * @param hostLView The view to which the node belongs
 * @returns The ViewContainerRef instance to use
 */
export function createContainerRef(
    hostTNode: TElementNode | TContainerNode | TElementContainerNode,
    hostLView: LView): ViewContainerRef {
      devMode && assertTNodeType(hostTNode, TNodeType.AnyContainer | TNodeType.AnyRNode);

    let lContainer: LContainer;
    const slotValue = hostLView[hostTNode.index];
    if (isLContainer(slotValue)) {
        // If the host is a container, we don't need to create a new LContainer
        lContainer = slotValue;
    } else {
        let commentNode: IComment;
        // If the host is an element container, the native host element is guaranteed to be a
        // comment and we can reuse that comment as anchor element for the new LContainer.
        // The comment node in question is already part of the DOM structure so we don't need to append
        // it again.
        if (hostTNode.type & TNodeType.ElementContainer) {
            commentNode = unwrapRNode(slotValue) as IComment;
        } else {
            // If the host is a regular element, we have to insert a comment node manually which will
            // be used as an anchor when inserting elements. In this specific case we use low-level DOM
            // manipulation to insert it.
            const renderer = hostLView[RENDERER];
            devMode && devMode.rendererCreateComment++;
            commentNode = renderer.createComment(devMode ? 'container' : '');

            const hostNative = getNativeByTNode(hostTNode, hostLView)!;
            const parentOfHostNative = renderer.parentNode(hostNative);
            renderer.insertBefore(parentOfHostNative!, commentNode, renderer.nextSibling(hostNative), false);
        }

        hostLView[hostTNode.index] = lContainer =
            createLContainer(slotValue, hostLView, commentNode, hostTNode);

        addToViewTree(hostLView, lContainer);
    }

    return new ViewContainerRefImpl(lContainer, hostTNode, hostLView);
}
