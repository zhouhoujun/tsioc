import { BootContext } from '@tsdi/boot';
import { ComponentBuilderToken } from '../IComponentBuilder';

export const BootTemplateHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.type) {
        if (ctx.template) {
            ctx.target = await ctx.getContainer().get(ComponentBuilderToken).resolveTemplate({
                parent: ctx,
                template: ctx.template,
                injector: ctx.injector,
                providers: ctx.providers
            });
        }
        if (ctx.target) {
            await next();
        }
    } else {
        await next();
    }
};
