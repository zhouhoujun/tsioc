import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { TemplateDecoratorRegisterer } from './TemplateDecoratorRegisterer';

export class DecorTemplateParseHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        let reg = this.container.get(TemplateDecoratorRegisterer);
        if (reg.has(ctx.decorator)) {
            await this.execFuncs(ctx, reg.getFuncs(this.container, ctx.decorator));
        }
        if (!ctx.selector) {
            await next();
        }
    }
}

