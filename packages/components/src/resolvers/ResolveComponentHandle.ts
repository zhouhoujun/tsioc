import { ResolveHandle, BuildContext } from '@tsdi/boot';
import { IBindingTypeReflect } from '../bindings/IBindingTypeReflect';

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
        return !!(<IBindingTypeReflect>ctx.targetReflect).componentDecorator;
    }
}
