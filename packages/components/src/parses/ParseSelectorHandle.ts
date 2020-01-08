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
        let options = ctx.getOptions();
        ctx.value = await ctx.getContainer().get(ComponentBuilderToken)
            .resolve({
                type: selector,
                scope: options.scope,
                parsing: true,
                template: options.template,
                injector: ctx.injector,
                providers: ctx.providers.inject({ provide: TemplateOptionToken, useValue: options })
            });
    }
    if (isNullOrUndefined(ctx.value)) {
        await next();
    }
};
