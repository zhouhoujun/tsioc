import { LContext } from './interfaces/context';
import { IElement, INode } from './interfaces/node';
import { LView } from './interfaces/view';
import { VNode, VNodeFlags, VNodeType, VProjectionNode } from './interfaces/vnode';
import { unwrapNode } from './native_nodes';
import { Renderer } from './renders/renderer';

const enum WalkTNodeTreeAction {
    /** node create in the native environment. Run on initial creation. */
    Create = 0,

    /**
     * node insert in the native environment.
     * Run when existing node has been detached and needs to be re-attached.
     */
    Insert = 1,

    /** node detach from the native environment */
    Detach = 2,

    /** node destruction using the renderer's API */
    Destroy = 3,
}


/**
 * Performs the operation of `action` on the node. Typically this involves inserting or removing
 * nodes on the LView or projection boundary.
 */
function applyNodes(
    renderer: Renderer, action: WalkTNodeTreeAction, vNode?: VNode, lView?: LView,
    parentRElement?: IElement, beforeNode?: INode, isProjection = false) {
    while (vNode != null) {
        const rawSlotValue = lView[vNode.index];
        const tNodeType = vNode.type;
        if (isProjection) {
            if (action === WalkTNodeTreeAction.Create) {
                rawSlotValue && attachPatchData(unwrapNode(rawSlotValue), lView);
                vNode.flags |= VNodeFlags.isProjected;
            }
        }
        if ((vNode.flags & VNodeFlags.isDetached) !== VNodeFlags.isDetached) {
            if (tNodeType & VNodeType.ElementContainer) {
                applyNodes(renderer, action, vNode.child, lView, parentRElement, beforeNode, false);
                applyToElementOrContainer(action, renderer, parentRElement, rawSlotValue, beforeNode);
            } else if (tNodeType & VNodeType.Projection) {
                applyProjectionRecursive(
                    renderer, action, lView, vNode as VProjectionNode, parentRElement, beforeNode);
            } else {
                applyToElementOrContainer(action, renderer, parentRElement, rawSlotValue, beforeNode);
            }
        }
        vNode = isProjection ? vNode.projectionNext : vNode.next;
    }
}

const PATCH_CTX = '_PATCH_CTX_';
/**
 * Assigns the given data to the given target (which could be a component,
 * directive or DOM node instance) using monkey-patching.
 */
export function attachPatchData(target: any, data: LView | LContext) {
    target[PATCH_CTX] = data;
}