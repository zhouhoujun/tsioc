import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { SelectorDecoratorRegisterer } from './SelectorDecoratorRegisterer';

export class DecorSelectorHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        let reg = this.container.get(SelectorDecoratorRegisterer);
        await this.execFuncs(ctx, reg.getFuncs(this.container, ctx.decorator));

        if (!ctx.selector) {
            await next();
        }
    }
}

