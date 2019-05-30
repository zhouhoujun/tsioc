import { isArray } from '@tsdi/ioc';
import { ContentElement } from '../ContentElement';
import { BuildHandle, BuildContext } from '@tsdi/boot';

export class ValidComponentHandle extends BuildHandle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.component) {
            if (isArray(ctx.component)) {
                if (ctx.target instanceof ContentElement) {
                    ctx.target.add(...ctx.component);
                    ctx.component = null;
                } else {
                    let sequence = this.container.get(ContentElement);
                    sequence.add(...ctx.component);
                    ctx.component = sequence;
                }
            }
        }
        await next();
    }
}
