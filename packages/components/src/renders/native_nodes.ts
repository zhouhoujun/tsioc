import { isLContainer } from '../interfaces/chk';
import { INode } from '../interfaces/dom';
import { CONTAINER_HEADER_OFFSET } from '../interfaces/container';
import { TElementNode, TNode, TNodeType } from '../interfaces/node';
import { DECLARATION_COMPONENT_VIEW, LView, PARENT, TVIEW, TView, T_HOST } from '../interfaces/view';
import { unwrapRNode } from '../util/view';
import { assertParentView, assertTNodeType } from './assert';

declare let devMode: any;


export function collectNativeNodes(view: TView, lView: LView, tNode: TNode | null, result: any[], isProjection = false): any[] {
    while (tNode !== null) {
        devMode &&
            assertTNodeType(
                tNode,
                TNodeType.AnyRNode | TNodeType.AnyContainer | TNodeType.Projection);
        const lNode = lView[tNode.index];
        if (lNode !== null) {
            result.push(unwrapRNode(lNode));
        }

        // A given lNode can represent either a native node or a LContainer (when it is a host of a
        // ViewContainerRef). When we find a LContainer we need to descend into it to collect root nodes
        // from the views in this container.
        if (isLContainer(lNode)) {
            for (let i = CONTAINER_HEADER_OFFSET; i < lNode.length; i++) {
                const lViewInAContainer = lNode[i];
                const lViewFirstChildTNode = lViewInAContainer[TVIEW].firstChild;
                if (lViewFirstChildTNode !== null) {
                    collectNativeNodes(
                        lViewInAContainer[TVIEW], lViewInAContainer, lViewFirstChildTNode, result);
                }
            }
        }

        const tNodeType = tNode.type;
        if (tNodeType & TNodeType.ElementContainer) {
            collectNativeNodes(view, lView, tNode.child, result);
        } else if (tNodeType & TNodeType.Projection) {
            const nodesInSlot = getProjectionNodes(lView, tNode);
            if (Array.isArray(nodesInSlot)) {
                result.push(...nodesInSlot);
            } else {
                const parentView = getLViewParent(lView[DECLARATION_COMPONENT_VIEW])!;
                devMode && assertParentView(parentView);
                collectNativeNodes(parentView[TVIEW], parentView, nodesInSlot, result, true);
            }
        }
        tNode = isProjection ? tNode.projectionNext : tNode.next;
    }

    return result;
}

export function getProjectionNodes(lView: LView, tNode: TNode | null): TNode | INode[] | null {
    if (tNode !== null) {
        const componentView = lView[DECLARATION_COMPONENT_VIEW];
        const componentHost = componentView[T_HOST] as TElementNode;
        const slotIdx = tNode.projection as number;
        return componentHost.projection![slotIdx];
    }
    return null;
}

/**
 * Gets the parent LView of the passed LView, if the PARENT is an LContainer, will get the parent of
 * that LContainer, which is an LView
 * @param lView the lView whose parent to get
 */
export function getLViewParent(lView: LView): LView | null {
    const parent = lView[PARENT];
    return isLContainer(parent) ? parent[PARENT]! : parent;
}