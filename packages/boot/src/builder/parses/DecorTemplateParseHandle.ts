import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { DecoratorTemplateRegisterer } from './DecoratorTemplateRegisterer';

export class DecorTemplateParseHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        let reg = this.container.get(DecoratorTemplateRegisterer);
        await this.execFuncs(ctx, reg.getFuncs(this.container, ctx.decorator));

        if (!ctx.selector) {
            await next();
        }
    }
}

