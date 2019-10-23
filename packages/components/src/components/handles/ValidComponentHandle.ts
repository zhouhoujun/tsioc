import { isArray } from '@tsdi/ioc';
import { BuildHandle, BuildContext } from '@tsdi/boot';
import { ElementNode } from '../ElementNode';

/**
 * valid component handle.
 *
 * @export
 * @class ValidComponentHandle
 * @extends {BuildHandle<BuildContext>}
 */
export class ValidComponentHandle extends BuildHandle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {

        if (isArray(ctx.composite)) {
            if (ctx.target instanceof ElementNode) {
                ctx.target.add(...ctx.composite);
                ctx.composite = null;
            } else {
                let content = this.container.getInstance(ElementNode);
                content.add(...ctx.composite);
                ctx.composite = content;
            }
        }

        await next();
    }
}
