import { isArray } from '@tsdi/ioc';
import { BuildHandle, BuildContext } from '@tsdi/boot';
import { CompositeNode } from '../CompositeNode';
import { CTX_VIEW_REF } from '../../ComponentRef';

/**
 * valid component handle.
 *
 * @export
 * @class ValidComponentHandle
 * @extends {BuildHandle<BuildContext>}
 */
export class ValidComponentHandle extends BuildHandle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        let viewRef = ctx.get(CTX_VIEW_REF);
        if (isArray(viewRef)) {
            // if (ctx.target instanceof CompositeNode) {
            //     ctx.target.add(...ctx.composite);
            //     ctx.composite = null;
            // } else {
            //     let content = this.container.getInstance(CompositeNode);
            //     content.add(...ctx.composite);
            //     ctx.composite = content;
            // }
        }

        await next();
    }
}
