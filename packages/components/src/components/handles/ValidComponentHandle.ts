import { isArray } from '@tsdi/ioc';
import { ContentElement } from '../ContentElement';
import { BuildHandle, BuildContext } from '@tsdi/boot';

export class ValidComponentHandle extends BuildHandle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.composite) {
            if (isArray(ctx.composite)) {
                if (ctx.target instanceof ContentElement) {
                    ctx.target.add(...ctx.composite);
                    ctx.composite = null;
                } else {
                    let content = this.container.get(ContentElement);
                    content.add(...ctx.composite);
                    ctx.composite = content;
                }
            }
        }
        await next();
    }
}
