import { isLContainer } from '../interfaces/chk';
import { LContainer } from '../interfaces/container';
import { IComment } from '../interfaces/dom';
import { TContainerNode, TElementContainerNode, TElementNode, TNodeType } from '../interfaces/node';
import { LView, RENDERER } from '../interfaces/view';
import { ViewContainerRef } from '../refs/container';
import { getNativeByTNode, unwrapRNode } from '../util/view';

declare let devMode: any;
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
    //   devMode && assertTNodeType(hostTNode, TNodeType.AnyContainer | TNodeType.AnyRNode);

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

    return new ViewContainerRef(lContainer, hostTNode, hostLView);
}
