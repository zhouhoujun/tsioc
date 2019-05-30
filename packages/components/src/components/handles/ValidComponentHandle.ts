import { BuildHandle } from '../../core';
import { BuildContext } from '../../builder';
import { isArray } from '@tsdi/ioc';
import { ContentElement } from '../ContentElement';

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
