import { isLContainer } from '../interfaces/chk';
import { INode } from '../interfaces/dom';
import { TElementNode, TNode, TNodeType } from '../interfaces/node';
import { CONTAINER_HEADER_OFFSET, LContainer } from '../interfaces/container';
import { DECLARATION_COMPONENT_VIEW, HOST, LView, PARENT, TVIEW, TView, T_HOST } from '../interfaces/view';
import { unwrapRNode } from '../util/view';



export function collectNativeNodes(view: TView, lView: LView, node: TNode | null, result: any[], isProjection = false): any[] {
    while (node !== null) {
        const lNode = lView[node.index];
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

        const tNodeType = node.type;
        if (tNodeType & TNodeType.ElementContainer) {
            collectNativeNodes(view, lView, node.child, result);
        } else if (tNodeType & TNodeType.Projection) {
            const nodesInSlot = getProjectionNodes(lView, node);
            if (Array.isArray(nodesInSlot)) {
                result.push(...nodesInSlot);
            } else {
                const parentView = getLViewParent(lView[DECLARATION_COMPONENT_VIEW])!;
                collectNativeNodes(parentView[TVIEW], parentView, nodesInSlot, result, true);
            }
        }
        node = isProjection ? node.projectionNext : node.next;
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