import { INode } from './node';
import { LView } from './view';

/**
 * The internal view context which is specific to a given DOM element, directive or
 * component instance. Each value in here (besides the LView and element node details)
 * can be present, null or undefined. If undefined then it implies the value has not been
 * looked up yet, otherwise, if null, then a lookup was executed and nothing was found.
 *
 * Each value will get filled when the respective value is examined within the getContext
 * function. The component, element and each directive instance will share the same instance
 * of the context.
 */
 export interface LContext {
    /**
     * The component's parent view data.
     */
    lView: LView;
  
    /**
     * The index instance of the node.
     */
    nodeIndex: number;
  
    /**
     * The instance of the DOM node that is attached to the lNode.
     */
    native: INode;
  
    /**
     * The instance of the Component node.
     */
    component?: any;
  
    /**
     * The list of active directives that exist on this element.
     */
    directives?: any[];
  
    /**
     * The map of local references (local reference name => element or directive instance) that exist
     * on this element.
     */
    localRefs: Record<string, any>;
  }
  