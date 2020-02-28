import { IBuildContext } from '@tsdi/boot';
import { ComponentBuilderToken } from '../IComponentBuilder';

export const ParseTemplateHandle = async function (ctx: IBuildContext, next: () => Promise<void>): Promise<void> {
    let template = ctx.getTemplate();
    if (!ctx.value && !ctx.type && template) {
        let options = {
            parent: ctx,
            template: template
        };
        ctx.value = ctx.injector.getInstance(ComponentBuilderToken)
            .resolveTemplate(options, ctx.providers);
    }
    await next();
};
