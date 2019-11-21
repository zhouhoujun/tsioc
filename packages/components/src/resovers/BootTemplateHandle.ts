import { BootContext, BootHandle } from '@tsdi/boot';
import { ComponentBuilderToken } from '../IComponentBuilder';
import { Component } from '../decorators';

export class BootTemplateHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.module) {
            let options = ctx.getOptions();
            if (options.template) {
                ctx.target = await this.container.get(ComponentBuilderToken).resolveTemplate({
                    decorator: ctx.decorator || Component.toString(),
                    scope: options.scope,
                    template: options.template,
                    raiseContainer: ctx.getContainerFactory()
                });
            }
            if (ctx.target) {
                await next();
            }
        } else {
            await next();
        }
    }
}
