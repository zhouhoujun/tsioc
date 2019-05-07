import { CompositeHandle } from '../../core';
import { BootContext } from '../../BootContext';
import { BindingTemplateHandle } from './BindingTemplateHandle';


export class BindingScope extends CompositeHandle<BootContext> {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        ctx.template = ctx.template || ctx.annoation.template;
        if (ctx.template) {
            await super.execute(ctx, next);
        } else {
            await next();
        }
    }

    setup() {
        this.use(BindingTemplateHandle, true)
    }
}
