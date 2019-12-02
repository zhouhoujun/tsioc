import { BuildHandle, BuildContext } from '@tsdi/boot';
import { ElementNode } from '../ElementNode';
import { ViewRef } from '../../ComponentRef';


/**
 * binding component handle.
 *
 * @export
 * @class BindingComponentHandle
 * @extends {BuildHandle<BuildContext>}
 */
export class BindingComponentHandle extends BuildHandle<BuildContext> {
    /**
     * execute binding.
     *
     * @param {BuildContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof BindingComponentHandle
     */
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.composite instanceof ElementNode) {
            ctx.composite.$scope = ctx.target;
        }
        await next();
    }
}
