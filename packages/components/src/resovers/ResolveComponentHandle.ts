import { ResolveHandle, BuildContext } from '@tsdi/boot';
import { DesignDecoratorRegisterer, DecoratorScopes } from '@tsdi/ioc';
import { ComponentRegisterAction } from '../registers';

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
        return this.container.get(DesignDecoratorRegisterer).has(ctx.decorator, DecoratorScopes.Class, ComponentRegisterAction)
    }
}
