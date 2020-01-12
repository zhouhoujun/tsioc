import { isNullOrUndefined } from '@tsdi/ioc';
import { TemplateContext, TemplateOptionToken } from './TemplateContext';
import { ComponentBuilderToken } from '../IComponentBuilder';


/**
 * parse selector handle.
 *
 * @export
 * @class ParseSelectorHandle
 * @extends {ParsersHandle}
 */
export const ParseSelectorHandle = async function (ctx: TemplateContext, next: () => Promise<void>): Promise<void> {
    if (ctx.selector) {
        let selector = ctx.selector;
        let template = ctx.template;
        ctx.value = await ctx.getContainer().get(ComponentBuilderToken)
            .resolveRef({
                type: selector,
                parent: ctx,
                // parsing: true,
                template: template,
                injector: ctx.injector,
                providers: ctx.providers.inject({ provide: TemplateOptionToken, useValue: ctx.getOptions() })
            });
    }
    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
};
