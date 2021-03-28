import { isLContainer } from './chk';
import { INode } from './interfaces/node';
import { VElementNode, VNode, VNodeType } from './interfaces/vnode';
import { CONTAINER_HEADER_OFFSET, LContainer } from './interfaces/container';
import { DECLARATION_COMPONENT_VIEW, HOST, LView, PARENT, VIEW, View, V_HOST } from './interfaces/view';

export function unwrapNode(value: INode | LView | LContainer): INode {
    while (Array.isArray(value)) {
        value = value[HOST];
    }
    return value as INode;
}

export function collectNativeNodes(view: View, lView: LView, node: VNode | null, result: any[], isProjection = false): any[] {
    while (node !== null) {
        const lNode = lView[node.index];
        if (lNode !== null) {
            result.push(unwrapNode(lNode));
        }

        // A given lNode can represent either a native node or a LContainer (when it is a host of a
        // ViewContainerRef). When we find a LContainer we need to descend into it to collect root nodes
        // from the views in this container.
        if (isLContainer(lNode)) {
            for (let i = CONTAINER_HEADER_OFFSET; i < lNode.length; i++) {
                const lViewInAContainer = lNode[i];
                const lViewFirstChildTNode = lViewInAContainer[VIEW].firstChild;
                if (lViewFirstChildTNode !== null) {
                    collectNativeNodes(
                        lViewInAContainer[VIEW], lViewInAContainer, lViewFirstChildTNode, result);
                }
            }
        }

        const tNodeType = node.type;
        if (tNodeType & VNodeType.ElementContainer) {
            collectNativeNodes(view, lView, node.child, result);
        } else if (tNodeType & VNodeType.Projection) {
            const componentView = lView[DECLARATION_COMPONENT_VIEW];
            const componentHost = componentView[V_HOST] as VElementNode;
            const slotIdx = node.projection as number;

            const nodesInSlot = componentHost.projection[slotIdx];
            if (Array.isArray(nodesInSlot)) {
                result.push(...nodesInSlot);
            } else {
                const parentView = getLViewParent(componentView);
                collectNativeNodes(parentView[VIEW], parentView, nodesInSlot, result, true);
            }
        }
        node = isProjection ? node.projectionNext : node.next;
    }

    return result;
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