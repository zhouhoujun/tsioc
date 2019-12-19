import { ResolveHandle, BuildContext } from '@tsdi/boot';
import { IComponentReflect } from '../bindings/IComponentReflect';

/**
 * resolve component handle.
 *
 * @export
 * @abstract
 * @class ResolveComponentHandle
 * @extends {ResolveHandle}
 */
export abstract class ResolveComponentHandle extends ResolveHandle {

    isComponent(ctx: BuildContext): boolean {
        return (<IComponentReflect>ctx.targetReflect).component;
    }
}
