import { BootContext } from '@tsdi/boot';
import { ComponentBuilderToken } from '../IComponentBuilder';
import { Component } from '../decorators/Component';

export const BootTemplateHandle = async function (ctx: BootContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.type) {
        let options = ctx.getOptions();
        if (options.template) {
            ctx.target = await ctx.getContainer().get(ComponentBuilderToken).resolveTemplate({
                decorator: ctx.decorator || Component.toString(),
                scope: options.scope,
                template: options.template,
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
