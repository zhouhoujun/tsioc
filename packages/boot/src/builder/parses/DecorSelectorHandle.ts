import { ParseHandle } from './ParseHandle';
import { ParseContext } from './ParseContext';
import { SelectorDecoratorRegisterer } from './SelectorDecoratorRegisterer';
import { MetadataService } from '@tsdi/ioc';

export class DecorSelectorHandle extends ParseHandle {
    async execute(ctx: ParseContext, next?: () => Promise<void>): Promise<void> {
        let reg = this.container.get(SelectorDecoratorRegisterer);
        let decors = this.getDecortaors(ctx);
        if (decors.length) {
            let hanles = [];
            decors.forEach(d => {
                if (reg.has(d)) {
                    hanles = hanles.concat(reg.getFuncs(this.container, d));
                }
            });
            await this.execFuncs(ctx, hanles, next);
        } else if (next) {
            await next();
        }
    }

    protected getDecortaors(ctx: ParseContext) {
        return this.container
            .get(MetadataService)
            .getClassDecorators(ctx.type);
    }
}

