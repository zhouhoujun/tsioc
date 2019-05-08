import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { SelectorDecoratorRegisterer } from './SelectorDecoratorRegisterer';
import { MetadataService } from '@tsdi/ioc';

export class DecorSelectorHandle extends ParseHandle {
    async execute(ctx: ParseContext, next: () => Promise<void>): Promise<void> {
        let reg = this.container.get(SelectorDecoratorRegisterer);
        let decors = this.getDecortaors(ctx);
        if (decors.length) {
            await Promise.all(decors.map(async d => {
                if (reg.has(d)) {
                    ctx.decorator = d;
                    if (!ctx.selector) {
                        await this.execFuncs(ctx, reg.getFuncs(this.container, d));
                    }
                }
            }));
        }

        if (!ctx.selector) {
            await next();
        }
    }

    protected getDecortaors(ctx: ParseContext) {
        return this.container
            .get(MetadataService)
            .getClassDecorators(ctx.type);
    }
}

